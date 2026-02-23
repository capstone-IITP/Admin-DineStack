import { NextRequest, NextResponse } from 'next/server';

/**
 * Vercel Edge Middleware — Super Admin IP Whitelisting
 *
 * Blocks all requests to /super-admin/* and /api/super-admin/*
 * unless the client IP is in the SUPER_ADMIN_ALLOWED_IPS allowlist.
 * Runs at the edge — blocked requests never reach the backend.
 */
export function middleware(request: NextRequest) {
    const allowedIpsRaw = process.env.SUPER_ADMIN_ALLOWED_IPS || '';
    const allowedIps = allowedIpsRaw
        .split(',')
        .map(ip => ip.trim())
        .filter(Boolean);

    // If no IPs configured, block everything (fail-closed)
    if (allowedIps.length === 0) {
        return new NextResponse('Access Denied', { status: 403 });
    }

    // Extract client IP from x-forwarded-for (first value) or fallback header
    const forwarded = request.headers.get('x-forwarded-for');
    const clientIp = forwarded
        ? forwarded.split(',')[0].trim()
        : request.headers.get('x-real-ip') || '';

    if (!clientIp || !allowedIps.includes(clientIp)) {
        return new NextResponse('Access Denied', { status: 403 });
    }

    // IP is whitelisted — continue normally
    return NextResponse.next();
}

export const config = {
    matcher: [
        '/super-admin/:path*',
        '/api/super-admin/:path*',
    ],
};
