import {SignJWT, jwtVerify} from 'jose';
import {createHash} from 'crypto';

export const AUTH_COOKIE = 'auth';

function secret(): Uint8Array {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error('AUTH_SECRET is not set');
  return new TextEncoder().encode(s);
}

export async function createSessionToken(email?: string): Promise<string> {
  return new SignJWT({role: 'member', ...(email ? {email} : {})})
    .setProtectedHeader({alg: 'HS256'})
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret());
}

export async function verifySessionToken(token?: string): Promise<boolean> {
  if (!token) return false;
  try {
    await jwtVerify(token, secret());
    return true;
  } catch {
    return false;
  }
}

// ---- Email login (one-time code) helpers --------------------------------

// Allowed login emails come from env LOGIN_ALLOWED_EMAILS (comma-separated).
// Defaults to seo@platinumlist.net so the feature works before the env is set.
export function allowedEmails(): string[] {
  const raw = process.env.LOGIN_ALLOWED_EMAILS || 'seo@platinumlist.net';
  return raw
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function normalizeEmail(email: unknown): string {
  return String(email || '').trim().toLowerCase();
}

export function isEmailAllowed(email: string): boolean {
  return allowedEmails().includes(normalizeEmail(email));
}

// Peppered hash of a login code (so plain codes are never stored).
export function hashCode(code: string, email: string): string {
  const pepper = process.env.AUTH_SECRET || '';
  return createHash('sha256').update(`${code}:${normalizeEmail(email)}:${pepper}`).digest('hex');
}

export function generateCode(): string {
  // 6-digit numeric code, zero-padded.
  return String(Math.floor(100000 + Math.random() * 900000));
}
