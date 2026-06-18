import { readFileSync } from 'fs';
import { NextRequest, NextResponse } from 'next/server';
import { resolve } from 'path';

const USERS_FILE = process.env.USERS_FILE || resolve(process.cwd(), '../../.users');

interface UserEntry {
  username: string;
  password: string;
}

function loadUsers(): UserEntry[] {
  try {
    const raw = readFileSync(USERS_FILE, 'utf-8');
    return raw
      .split('\n')
      .map(l => l.trim())
      .filter(l => l && !l.startsWith('#'))
      .map(l => {
        const idx = l.indexOf(':');
        if (idx < 1) return null;
        return { username: l.slice(0, idx), password: l.slice(idx + 1) };
      })
      .filter(Boolean) as UserEntry[];
  } catch {
    return [];
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { username, password } = body;

  if (!username || !password) {
    return NextResponse.json({ ok: false, error: 'Missing credentials' }, { status: 400 });
  }

  const users = loadUsers();

  // If no .users file exists, auth is disabled — let everyone in
  if (users.length === 0) {
    return NextResponse.json({ ok: true, username });
  }

  const match = users.some(u => u.username === username && u.password === password);
  if (!match) {
    return NextResponse.json({ ok: false, error: 'Invalid username or password' }, { status: 401 });
  }

  return NextResponse.json({ ok: true, username });
}
