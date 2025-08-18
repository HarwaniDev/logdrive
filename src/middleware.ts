import { auth } from "~/server/auth/index"
import { NextResponse } from "next/server"

export default auth((req) => {
  const isLoggedIn = !!req.auth
    
  if (!isLoggedIn) {
    const signInUrl = new URL("/api/auth/signin", req.url)
    signInUrl.searchParams.set("callbackUrl", req.url)
    return NextResponse.redirect(signInUrl)
  }
  
  return NextResponse.next()
})

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - signin (sign-in page)
         */
        "/((?!api|_next/static|_next/image|favicon.ico|signin).*)",
    ],
}