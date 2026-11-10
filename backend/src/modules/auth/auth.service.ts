import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { query, queryOne, withTransaction } from '../../lib/db';
import {
  generateTokenPair,
  hashRefreshToken,
  generateEmailToken,
  generatePasswordResetToken,
} from '../../lib/jwt';
import {
  sendEmailVerification,
  sendPasswordReset,
} from '../../lib/email';
import { createError } from '../../middleware/errors';
import config from '../../config';
import type {
  RegisterInput,
  LoginInput,
  ResetPasswordInput,
} from './auth.schema';

const BCRYPT_ROUNDS = 12;

// ---------------------------------------------------------------------------
// User record type
// ---------------------------------------------------------------------------
interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  role: string;
  email_verified: boolean;
  email_verify_token: string | null;
  email_verify_expires_at: Date | null;
  password_reset_token: string | null;
  password_reset_expires_at: Date | null;
  verification_status: string;
  is_active: boolean;
}

interface ProfileRow {
  id: string;
  full_name: string;
  username: string;
}

// ---------------------------------------------------------------------------
// Register
// ---------------------------------------------------------------------------
export async function register(input: RegisterInput): Promise<{
  user: { id: string; email: string; role: string };
  accessToken: string;
  refreshToken: string;
}> {
  // Check for existing email / username
  const existingEmail = await queryOne<{ id: string }>(
    'SELECT id FROM users WHERE email = $1',
    [input.email]
  );
  if (existingEmail) throw createError('Email address is already registered', 409, 'EMAIL_EXISTS');

  const existingUsername = await queryOne<{ id: string }>(
    'SELECT id FROM student_profiles WHERE username = $1',
    [input.username]
  );
  if (existingUsername) throw createError('Username is already taken', 409, 'USERNAME_EXISTS');

  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
  const { token: verifyToken, hash: verifyHash, expiresAt: verifyExpiry } = generateEmailToken();

  // Determine if this user should be auto-admin
  const role = config.admin.emails.includes(input.email) ? 'admin' : 'student';

  const slug = input.username.toLowerCase().replace(/[^a-z0-9-]/g, '-');

  return withTransaction(async (client) => {
    // Insert user
    const userResult = await client.query(
      `INSERT INTO users (email, password_hash, role, email_verify_token, email_verify_expires_at)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, email, role`,
      [input.email, passwordHash, role, verifyHash, verifyExpiry]
    );
    const user = userResult.rows[0] as UserRow;

    // Insert student profile
    await client.query(
      `INSERT INTO student_profiles (user_id, full_name, username)
       VALUES ($1, $2, $3)`,
      [user.id, input.fullName, slug]
    );

    // Record in audit log
    await client.query(
      `INSERT INTO audit_logs (user_id, action, metadata)
       VALUES ($1, 'REGISTER', $2)`,
      [user.id, JSON.stringify({ email: input.email, username: slug })]
    );

    // Issue tokens
    const tokens = generateTokenPair({ sub: user.id, email: user.email, role: user.role });

    // Store refresh token
    await client.query(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, $3)`,
      [user.id, tokens.refreshTokenHash, tokens.refreshExpiresAt]
    );

    // Send verification email (non-blocking in dev)
    sendEmailVerification(input.email, input.fullName, verifyToken).catch((err) => {
      console.error('[auth] Failed to send verification email:', err.message);
    });

    return {
      user: { id: user.id, email: user.email, role: user.role },
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  });
}

// ---------------------------------------------------------------------------
// Login
// ---------------------------------------------------------------------------
export async function login(
  input: LoginInput,
  meta: { userAgent?: string; ipAddress?: string }
): Promise<{
  user: { id: string; email: string; role: string; emailVerified: boolean };
  accessToken: string;
  refreshToken: string;
}> {
  const user = await queryOne<UserRow>(
    'SELECT id, email, password_hash, role, email_verified, is_active FROM users WHERE email = $1',
    [input.email]
  );

  // Use constant-time comparison to prevent timing attacks
  const dummyHash = '$2a$12$dummy.hash.to.prevent.timing.attacks.on.nonexistent.users';
  const hashToCheck = user?.password_hash ?? dummyHash;
  const isValid = await bcrypt.compare(input.password, hashToCheck);

  if (!user || !isValid) {
    throw createError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
  }

  if (!user.is_active) {
    throw createError('Your account has been suspended', 403, 'ACCOUNT_SUSPENDED');
  }

  const tokens = generateTokenPair({ sub: user.id, email: user.email, role: user.role });

  await query(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at, user_agent, ip_address)
     VALUES ($1, $2, $3, $4, $5::inet)`,
    [user.id, tokens.refreshTokenHash, tokens.refreshExpiresAt, meta.userAgent ?? null, meta.ipAddress ?? null]
  );

  await query(
    `UPDATE users SET last_seen_at = NOW() WHERE id = $1`,
    [user.id]
  );

  await query(
    `INSERT INTO audit_logs (user_id, action, ip_address, user_agent)
     VALUES ($1, 'LOGIN', $2::inet, $3)`,
    [user.id, meta.ipAddress ?? null, meta.userAgent ?? null]
  );

  return {
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      emailVerified: user.email_verified,
    },
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
  };
}

// ---------------------------------------------------------------------------
// Refresh Token
// ---------------------------------------------------------------------------
export async function refreshAccessToken(rawToken: string): Promise<{
  accessToken: string;
  refreshToken: string;
}> {
  const tokenHash = hashRefreshToken(rawToken);

  const storedToken = await queryOne<{
    id: string;
    user_id: string;
    expires_at: Date;
    revoked: boolean;
  }>(
    `SELECT id, user_id, expires_at, revoked FROM refresh_tokens WHERE token_hash = $1`,
    [tokenHash]
  );

  if (!storedToken || storedToken.revoked || new Date() > storedToken.expires_at) {
    throw createError('Invalid or expired refresh token', 401, 'REFRESH_TOKEN_INVALID');
  }

  const user = await queryOne<{ id: string; email: string; role: string; is_active: boolean }>(
    'SELECT id, email, role, is_active FROM users WHERE id = $1',
    [storedToken.user_id]
  );

  if (!user || !user.is_active) {
    throw createError('Account not found or suspended', 403, 'ACCOUNT_INACTIVE');
  }

  // Rotate refresh token (revoke old, issue new)
  const newTokens = generateTokenPair({ sub: user.id, email: user.email, role: user.role });

  await withTransaction(async (client) => {
    await client.query(`UPDATE refresh_tokens SET revoked = TRUE WHERE id = $1`, [storedToken.id]);
    await client.query(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
      [user.id, newTokens.refreshTokenHash, newTokens.refreshExpiresAt]
    );
  });

  return {
    accessToken: newTokens.accessToken,
    refreshToken: newTokens.refreshToken,
  };
}

// ---------------------------------------------------------------------------
// Logout
// ---------------------------------------------------------------------------
export async function logout(rawToken: string): Promise<void> {
  const tokenHash = hashRefreshToken(rawToken);
  await query(
    'UPDATE refresh_tokens SET revoked = TRUE WHERE token_hash = $1',
    [tokenHash]
  );
}

// ---------------------------------------------------------------------------
// Logout All (all sessions)
// ---------------------------------------------------------------------------
export async function logoutAll(userId: string): Promise<void> {
  await query(
    'UPDATE refresh_tokens SET revoked = TRUE WHERE user_id = $1',
    [userId]
  );
}

// ---------------------------------------------------------------------------
// Email Verification
// ---------------------------------------------------------------------------
export async function verifyEmail(token: string): Promise<void> {
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  const user = await queryOne<UserRow>(
    `SELECT id, email_verified, email_verify_expires_at
     FROM users
     WHERE email_verify_token = $1`,
    [tokenHash]
  );

  if (!user) throw createError('Invalid verification token', 400, 'TOKEN_INVALID');
  if (user.email_verified) throw createError('Email is already verified', 400, 'ALREADY_VERIFIED');
  if (user.email_verify_expires_at && new Date() > user.email_verify_expires_at) {
    throw createError('Verification token has expired. Request a new one.', 400, 'TOKEN_EXPIRED');
  }

  await query(
    `UPDATE users
     SET email_verified = TRUE, email_verify_token = NULL, email_verify_expires_at = NULL
     WHERE id = $1`,
    [user.id]
  );
}

// ---------------------------------------------------------------------------
// Resend Verification Email
// ---------------------------------------------------------------------------
export async function resendVerification(userId: string): Promise<void> {
  const user = await queryOne<UserRow & { full_name: string }>(
    `SELECT u.id, u.email, u.email_verified, sp.full_name
     FROM users u
     JOIN student_profiles sp ON sp.user_id = u.id
     WHERE u.id = $1`,
    [userId]
  );

  if (!user) throw createError('User not found', 404, 'NOT_FOUND');
  if (user.email_verified) throw createError('Email is already verified', 400, 'ALREADY_VERIFIED');

  const { token, hash, expiresAt } = generateEmailToken();

  await query(
    'UPDATE users SET email_verify_token = $1, email_verify_expires_at = $2 WHERE id = $3',
    [hash, expiresAt, userId]
  );

  await sendEmailVerification(user.email, user.full_name, token);
}

// ---------------------------------------------------------------------------
// Forgot Password
// ---------------------------------------------------------------------------
export async function forgotPassword(email: string): Promise<void> {
  const user = await queryOne<UserRow & { full_name: string }>(
    `SELECT u.id, u.email, sp.full_name
     FROM users u
     LEFT JOIN student_profiles sp ON sp.user_id = u.id
     WHERE u.email = $1 AND u.is_active = TRUE`,
    [email]
  );

  // Always return success to prevent email enumeration
  if (!user) return;

  const { token, hash, expiresAt } = generatePasswordResetToken();

  await query(
    'UPDATE users SET password_reset_token = $1, password_reset_expires_at = $2 WHERE id = $3',
    [hash, expiresAt, user.id]
  );

  await sendPasswordReset(email, user.full_name ?? 'Student', token);
}

// ---------------------------------------------------------------------------
// Reset Password
// ---------------------------------------------------------------------------
export async function resetPassword(input: ResetPasswordInput): Promise<void> {
  const tokenHash = crypto.createHash('sha256').update(input.token).digest('hex');

  const user = await queryOne<UserRow>(
    `SELECT id, password_reset_expires_at
     FROM users
     WHERE password_reset_token = $1`,
    [tokenHash]
  );

  if (!user) throw createError('Invalid or expired reset token', 400, 'TOKEN_INVALID');
  if (user.password_reset_expires_at && new Date() > user.password_reset_expires_at) {
    throw createError('Reset token has expired. Request a new one.', 400, 'TOKEN_EXPIRED');
  }

  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);

  await withTransaction(async (client) => {
    await client.query(
      `UPDATE users
       SET password_hash = $1, password_reset_token = NULL, password_reset_expires_at = NULL
       WHERE id = $2`,
      [passwordHash, user.id]
    );
    // Revoke all sessions after password change
    await client.query(
      'UPDATE refresh_tokens SET revoked = TRUE WHERE user_id = $1',
      [user.id]
    );
    await client.query(
      `INSERT INTO audit_logs (user_id, action) VALUES ($1, 'PASSWORD_RESET')`,
      [user.id]
    );
  });
}
