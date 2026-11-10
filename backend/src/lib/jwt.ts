import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import config from '../config';

export interface JwtPayload {
  sub: string;        // user ID
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  refreshTokenHash: string;
  refreshExpiresAt: Date;
}

export function signAccessToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: `${config.jwt.accessExpiryMinutes}m`,
    issuer: 'collabsphere',
    audience: 'collabsphere-app',
  });
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, config.jwt.secret, {
    issuer: 'collabsphere',
    audience: 'collabsphere-app',
  }) as JwtPayload;
}

export function generateTokenPair(payload: Omit<JwtPayload, 'iat' | 'exp'>): TokenPair {
  const accessToken = signAccessToken(payload);
  const refreshToken = uuidv4() + '.' + crypto.randomBytes(32).toString('hex');
  const refreshTokenHash = hashRefreshToken(refreshToken);
  const refreshExpiresAt = new Date(
    Date.now() + config.jwt.refreshExpiryDays * 24 * 60 * 60 * 1000
  );

  return { accessToken, refreshToken, refreshTokenHash, refreshExpiresAt };
}

export function hashRefreshToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function generateEmailToken(): { token: string; hash: string; expiresAt: Date } {
  const token = crypto.randomBytes(32).toString('hex');
  const hash = crypto.createHash('sha256').update(token).digest('hex');
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h
  return { token, hash, expiresAt };
}

export function generatePasswordResetToken(): { token: string; hash: string; expiresAt: Date } {
  const token = crypto.randomBytes(32).toString('hex');
  const hash = crypto.createHash('sha256').update(token).digest('hex');
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1h
  return { token, hash, expiresAt };
}
