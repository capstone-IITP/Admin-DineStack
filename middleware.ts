import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Define protected routes
const isProtectedRoute = createRouteMatcher([
    '/',             // Dashboard
    '/((?!sign-in).*)' // Protect everything except sign-in
]);

const isPublicRoute = createRouteMatcher([
    '/sign-in(.*)',
    '/api/uploadthing(.*)' // If you use uploadthing or other public webhooks
]);

export default clerkMiddleware(async (auth, req) => {
    if (isPublicRoute(req)) return;

    const { userId, sessionClaims, redirectToSignIn } = await auth();

    // 1. If not logged in, redirect to sign-in
    if (!userId) {
        return redirectToSignIn();
    }

    // 2. Access Control Logic
    // Check metadata for role ONLY
    const role = (sessionClaims as any)?.metadata?.role || (sessionClaims as any)?.role;

    // Strict Role Check: Must be 'super_admin'
    const isSuperAdmin = role === 'super_admin';

    // If user is logged in but NOT authorized
    if (!isSuperAdmin) {
        console.warn(`[Middleware] Unauthorized access attempt: ${userId} (Role: ${role})`);
        return new NextResponse('Access Denied: Super Admin privileges required.', { status: 403 });
    }

    // Allow access
});

export const config = {
    matcher: [
        // Skip Next.js internals and all static files, unless found in search params
        '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
        // Always run for API routes
        '/(api|trpc)(.*)',
    ],
};
