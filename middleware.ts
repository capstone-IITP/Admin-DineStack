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
        return new NextResponse(
            JSON.stringify({ message: 'Access Denied: No IPs configured' }),
            { status: 403, headers: { 'Content-Type': 'application/json' } }
        );
    }

    // On Vercel Edge, request.ip is the most reliable way to get the client IP
    // Fallback to Vercel specific header, then standard headers
    let clientIp = (request as any).ip;
    if (!clientIp) {
        const vercelForwarded = request.headers.get('x-vercel-forwarded-for');
        clientIp = vercelForwarded
            ? vercelForwarded.split(',')[0].trim()
            : (request.headers.get('x-forwarded-for')?.split(',')[0].trim() || request.headers.get('x-real-ip') || '');
    }

    if (!clientIp || !allowedIps.includes(clientIp)) {
        return new NextResponse(
            JSON.stringify({ message: `Access Denied: IP ${clientIp || 'Unknown'} not whitelisted` }),
            { status: 403, headers: { 'Content-Type': 'application/json' } }
        );
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
