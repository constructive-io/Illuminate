import { NextRequest, NextResponse } from 'next/server';

import { signJwt } from '@/lib/jwt';
import { userCount, verifyLogin } from '@/lib/settings';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { username, password } = body;

  if (!username || !password) {
    return NextResponse.json({ ok: false, error: 'Missing credentials' }, { status: 400 });
  }

  // The project must have at least one user — added via `wavegrid users add`.
  if (userCount() === 0) {
    return NextResponse.json({ ok: false, error: 'Auth not configured' }, { status: 503 });
  }

  if (!verifyLogin(username, password)) {
    return NextResponse.json({ ok: false, error: 'Invalid username or password' }, { status: 401 });
  }

  const token = signJwt(username);
  return NextResponse.json({ ok: true, username, token });
}
