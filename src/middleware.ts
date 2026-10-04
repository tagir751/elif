import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifyToken } from './lib/auth'
import { rateLimit } from './lib/rate-limit'

const publicRoutes = ['/login', '/api/auth/login']

const rolePrefixes: Record<string, string[]> = {
  admin: ['/admin'],
  manager: ['/manager'],
  teacher: ['/teacher'],
}

const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://elif.tagir75.ru',
  'https://elif.tagir75.ru',
]

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for') || ''
  return forwarded.split(',')[0].trim() || 'unknown'
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const response = NextResponse.next()

  // Rate limiting for API routes
  if (pathname.startsWith('/api')) {
    const ip = getClientIp(request)
    const isLogin = pathname === '/api/auth/login'
    const maxReqs = isLogin ? 30 : 100
    const windowMs = 60 * 1000

    const result = rateLimit(ip + ':' + pathname, maxReqs, windowMs)
    if (!result.allowed) {
      return new NextResponse(
        JSON.stringify({ error: 'Слишком много запросов. Попробуйте позже.' }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': '60',
          },
        }
      )
    }
  }

  // CORS + CSP for API routes
  if (pathname.startsWith('/api')) {
    const origin = request.headers.get('origin')
    if (origin && ALLOWED_ORIGINS.includes(origin)) {
      response.headers.set('Access-Control-Allow-Origin', origin)
      response.headers.set('Access-Control-Allow-Credentials', 'true')
      response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    }

    response.headers.set('Content-Security-Policy', "default-src 'self'; frame-ancestors 'none'")

    if (request.method === 'OPTIONS') {
      return new NextResponse(null, { status: 204, headers: response.headers })
    }
  }

  // Public routes
  if (publicRoutes.includes(pathname) || pathname === '/') {
    return response
  }

  // Static assets and API bypass middleware auth (handled per-route)
  if (pathname.startsWith('/_next') || pathname.startsWith('/api/') || pathname.startsWith('/favicon') || /^\/.+\.(png|jpg|jpeg|gif|svg|webp|avif|ico|css|js|json|txt|pdf|docx?|xlsx?)$/i.test(pathname)) {
    return response
  }

  // Auth check for page routes — accept either token or refreshToken
  let payload = null
  const token = request.cookies.get('token')?.value
  const refreshToken = request.cookies.get('refreshToken')?.value

  if (token) {
    try { payload = await verifyToken(token) } catch {}
  }

  if (!payload && refreshToken) {
    try { payload = await verifyToken(refreshToken) } catch {}
  }

  if (!payload) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const roles = payload.roles

  const allowed = Object.entries(rolePrefixes).some(([role, prefixes]) => {
    if (!roles.includes(role)) return false
    return prefixes.some((prefix) => pathname.startsWith(prefix))
  })

  if (!allowed) {
    if (roles.includes('admin')) return NextResponse.redirect(new URL('/admin', request.url))
    if (roles.includes('manager')) return NextResponse.redirect(new URL('/manager/today', request.url))
    if (roles.includes('teacher')) return NextResponse.redirect(new URL('/teacher/today', request.url))
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico|login|.*\\.(?:png|jpg|jpeg|gif|svg|webp|avif|ico|css|js|json|txt|pdf|docx?|xlsx?)$).*)'],
}
