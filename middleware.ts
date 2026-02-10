import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isProtectedRoute = createRouteMatcher([
    '/',             // Dashboard
    '/setup',        // Allow setup to be accessed (logic inside handles redirection)
    '/((?!sign-in|access-denied).*)' // Protect everything except sign-in and access-denied
]);

const isPublicRoute = createRouteMatcher([
    '/sign-in(.*)',
    '/access-denied',
    '/api/uploadthing(.*)' // If you use uploadthing or public webhooks
]);

export default clerkMiddleware(async (auth, req) => {
    if (isPublicRoute(req)) return;

    const { userId, sessionClaims, redirectToSignIn } = await auth();

    // 1. If not logged in, redirect to sign-in
    if (!userId) {
        return redirectToSignIn();
    }

    // 2. Identify Role
    // We check `publicMetadata` (accessible as `metadata` in sessionClaims usually, depending on JWT template)
    // IMPORTANT: Ensure Clerk JWT template includes `public_metadata` as `metadata` or `public_metadata`
    const role = (sessionClaims as any)?.metadata?.role || (sessionClaims as any)?.public_metadata?.role;

    // 3. Special Case: Setup Route
    // We allow authenticated users to access /setup to claim ownership if needed
    if (req.nextUrl.pathname === '/setup') {
        return;
    }

    // 4. Strict Role Check: Must be 'super_admin'
    if (role !== 'super_admin') {
        // If user has NO role, maybe they need to setup?
        // Redirect to /setup to check if they can claim ownership
        if (!role) {
            const url = new URL('/setup', req.url);
            return NextResponse.redirect(url);
        }

        // If they HAVE a role but it's not super_admin (or just rejected), deny.
        const url = new URL('/access-denied', req.url);
        return NextResponse.redirect(url);
    }

    // Allow access to protected routes if super_admin
});

export const config = {
    matcher: [
        // Skip Next.js internals and all static files, unless found in search params
        '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
        // Always run for API routes
        '/(api|trpc)(.*)',
    ],
};
