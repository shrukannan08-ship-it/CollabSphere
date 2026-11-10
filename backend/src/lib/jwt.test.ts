import { describe, it, expect } from 'vitest';
import {
  signAccessToken,
  verifyAccessToken,
  generateTokenPair,
  hashRefreshToken,
  generateEmailToken,
  generatePasswordResetToken,
} from './jwt';

describe('JWT and Token Utilities', () => {
  const testUser = {
    sub: '123e4567-e89b-12d3-a456-426614174000',
    email: 'student@example.edu',
    role: 'student',
  };

  it('signs and verifies access token correctly', () => {
    const token = signAccessToken(testUser);
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(20);

    const decoded = verifyAccessToken(token);
    expect(decoded.sub).toBe(testUser.sub);
    expect(decoded.email).toBe(testUser.email);
    expect(decoded.role).toBe(testUser.role);
  });

  it('generates paired tokens with hashed refresh token', () => {
    const pair = generateTokenPair(testUser);
    expect(pair.accessToken).toBeDefined();
    expect(pair.refreshToken).toBeDefined();
    expect(pair.refreshTokenHash).toBe(hashRefreshToken(pair.refreshToken));
    expect(pair.refreshExpiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it('generates secure random email verification tokens', () => {
    const t1 = generateEmailToken();
    const t2 = generateEmailToken();
    expect(t1.token).not.toBe(t2.token);
    expect(t1.hash).toBe(hashRefreshToken(t1.token));
    expect(t1.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it('generates secure password reset tokens', () => {
    const reset = generatePasswordResetToken();
    expect(reset.token).toBeDefined();
    expect(reset.hash).toBe(hashRefreshToken(reset.token));
    expect(reset.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });
});
