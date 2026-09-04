import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { db, users, sessions } from '@ai-crm/db';
import { eq } from 'drizzle-orm';

const JWT_SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET || 'super-secret-ai-agency-key-change-in-prod-2026'
);

export const COOKIE_NAME = 'ai_crm_session';

export interface UserSessionPayload {
  userId: string;
  email: string;
  name: string;
  role: 'admin' | 'operator';
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSessionToken(payload: UserSessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET);
}

export async function verifySessionToken(token: string): Promise<UserSessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as UserSessionPayload;
  } catch {
    return null;
  }
}

export async function getCurrentUser(): Promise<UserSessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export async function requireAuth(allowedRoles?: ('admin' | 'operator')[]) {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('UNAUTHORIZED');
  }
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    throw new Error('FORBIDDEN');
  }
  return user;
}
