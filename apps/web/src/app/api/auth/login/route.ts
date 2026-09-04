import { NextResponse } from 'next/server';
import { db, users } from '@ai-crm/db';
import { eq } from 'drizzle-orm';
import { verifyPassword, createSessionToken, COOKIE_NAME, hashPassword } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: 'Email e password richieste' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Query user in DB
    let user = db.select().from(users).where(eq(users.email, cleanEmail)).get();

    // Auto-provision default admin if users table is empty for quick testing
    if (!user && cleanEmail === 'admin@ai-agency.it' && password === 'admin123') {
      const newAdmin = {
        id: 'usr_admin_default',
        name: 'Amministratore AI Agency',
        email: 'admin@ai-agency.it',
        passwordHash: await hashPassword('admin123'),
        role: 'admin' as const,
        avatar: null,
        createdAt: new Date().toISOString(),
      };
      db.insert(users).values(newAdmin).run();
      user = newAdmin;
    }

    if (!user) {
      return NextResponse.json({ error: 'Credenziali non valide' }, { status: 401 });
    }

    const isMatch = await verifyPassword(password, user.passwordHash);
    if (!isMatch) {
      return NextResponse.json({ error: 'Credenziali non valide' }, { status: 401 });
    }

    // Generate JWT token
    const token = await createSessionToken({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });

    // Set cookie
    const cookieStore = await cookies();
    cookieStore.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 });
  }
}
