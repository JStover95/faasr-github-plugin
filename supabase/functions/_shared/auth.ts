/**
 * Authentication utilities for JWT token validation and session management
 *
 * Provides functions for:
 * - JWT token validation with cryptographic signature verification
 * - Session extraction from cookies
 * - Session creation with HMAC-SHA256 signing
 */

import { jwt } from './deps.ts';
import type { UserSession } from './types.ts';

/**
 * Session cookie name
 */
export const SESSION_COOKIE_NAME = 'faasr_session';

/**
 * JWT payload structure for session tokens
 */
interface JWTPayload {
  installationId: string;
  userLogin: string;
  userId: number;
  avatarUrl?: string;
  iat: number;
  exp: number;
}

/**
 * Type guard to verify JWT payload structure
 *
 * @param decoded - Decoded JWT payload (unknown type from jwt.verify)
 * @returns True if payload has the expected structure
 */
function isJWTPayload(decoded: unknown): decoded is JWTPayload {
  if (typeof decoded !== 'object' || decoded === null) {
    return false;
  }

  const payload = decoded as Record<string, unknown>;

  return (
    typeof payload.installationId === 'string' &&
    typeof payload.userLogin === 'string' &&
    typeof payload.userId === 'number' &&
    (payload.avatarUrl === undefined ||
      typeof payload.avatarUrl === 'string') &&
    typeof payload.iat === 'number' &&
    typeof payload.exp === 'number'
  );
}

/**
 * Extract session token from request cookies
 *
 * @param cookies - Cookie header value or cookie object
 * @returns Session token if found, null otherwise
 */
export function extractSessionToken(cookies: string | Headers): string | null {
  let cookieString: string;

  if (cookies instanceof Headers) {
    cookieString = cookies.get('cookie') || '';
  } else {
    cookieString = cookies;
  }

  if (!cookieString) {
    return null;
  }

  // Parse cookies
  const cookiePairs = cookieString.split(';').map((c) => c.trim());
  for (const pair of cookiePairs) {
    const [name, value] = pair.split('=');
    if (name === SESSION_COOKIE_NAME && value) {
      return decodeURIComponent(value);
    }
  }

  return null;
}

/**
 * Validate JWT token and extract session data
 *
 * Verifies the token signature using HMAC-SHA256, checks expiration,
 * and validates the token structure. Returns null for any invalid tokens.
 *
 * @param token - JWT token string
 * @returns Decoded session data or null if invalid, expired, or tampered with
 */
export function validateSessionToken(token: string): UserSession | null {
  const secret = Deno.env.get('JWT_SECRET');
  if (!secret) {
    console.error('JWT_SECRET environment variable is required');
    return null;
  }

  try {
    const decoded = jwt.verify(token, secret, {
      algorithms: ['HS256'],
    });

    if (!isJWTPayload(decoded)) {
      // Token payload doesn't have expected structure
      return null;
    }

    return {
      installationId: decoded.installationId,
      userLogin: decoded.userLogin,
      userId: decoded.userId,
      avatarUrl: decoded.avatarUrl,
      jwtToken: token,
      createdAt: new Date(decoded.iat * 1000),
      expiresAt: new Date(decoded.exp * 1000),
    };
  } catch (_error) {
    // Token is invalid, expired, or tampered with
    return null;
  }
}

/**
 * Create a session token from user session data
 *
 * Signs the token with HMAC-SHA256 using the JWT_SECRET environment variable.
 * Token expires after 24 hours. The secret must be set in Supabase Edge Function secrets.
 *
 * @param session - User session data
 * @returns JWT token string signed with HMAC-SHA256
 * @throws Error if JWT_SECRET environment variable is not set
 */
export function createSessionToken(
  session: Omit<UserSession, 'jwtToken' | 'createdAt' | 'expiresAt'>,
): string {
  const secret = Deno.env.get('JWT_SECRET');
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is required');
  }

  const payload = {
    installationId: session.installationId,
    userLogin: session.userLogin,
    userId: session.userId,
    avatarUrl: session.avatarUrl,
  };

  return jwt.sign(payload, secret, {
    algorithm: 'HS256',
    expiresIn: '24h',
  });
}

/**
 * Get session from request
 *
 * @param request - HTTP request object
 * @returns User session if valid, null otherwise
 */
export function getSessionFromRequest(request: Request): UserSession | null {
  const cookies = request.headers.get('cookie') || '';
  const token = extractSessionToken(cookies);
  if (!token) {
    return null;
  }
  return validateSessionToken(token);
}

/**
 * Create session cookie header value
 *
 * @param token - JWT token
 * @param maxAge - Cookie max age in seconds (default: 24 hours)
 * @returns Cookie header value
 */
export function createSessionCookie(
  token: string,
  maxAge: number = 24 * 60 * 60,
): string {
  return `${SESSION_COOKIE_NAME}=${
    encodeURIComponent(
      token,
    )
  }; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}; Path=/`;
}

/**
 * Create logout cookie (expires immediately)
 *
 * @returns Cookie header value for logout
 */
export function createLogoutCookie(): string {
  return `${SESSION_COOKIE_NAME}=; HttpOnly; Secure; SameSite=Strict; Max-Age=0; Path=/`;
}
