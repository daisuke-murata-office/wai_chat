import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  // Basic認証の環境変数を確認
  const basicAuthUser = process.env.BASIC_AUTH_USER;
  const basicAuthPassword = process.env.BASIC_AUTH_PASSWORD;

  // 環境変数が設定されていない場合はBasic認証をスキップ
  if (!basicAuthUser || !basicAuthPassword) {
    return NextResponse.next();
  }

  // Authorizationヘッダーを確認
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    return new NextResponse('認証が必要です', {
      status: 401,
      headers: {
        'WWW-Authenticate': 'Basic realm="Secure Area"',
        'Content-Type': 'text/plain; charset=utf-8',
      },
    });
  }

  // Base64デコードして認証情報を取得
  const encoded = authHeader.split(' ')[1];
  const decoded = Buffer.from(encoded, 'base64').toString('utf-8');
  const [username, password] = decoded.split(':');

  // 認証情報を検証
  if (username !== basicAuthUser || password !== basicAuthPassword) {
    return new NextResponse('認証に失敗しました', {
      status: 401,
      headers: {
        'WWW-Authenticate': 'Basic realm="Secure Area"',
        'Content-Type': 'text/plain; charset=utf-8',
      },
    });
  }

  // 認証成功時は次の処理に進む
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - socket.io (Socket.IO routes)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|socket.io).*)',
  ],
};