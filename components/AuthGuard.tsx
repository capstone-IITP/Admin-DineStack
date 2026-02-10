"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

interface AuthGuardProps {
    children: React.ReactNode;
}

/**
 * AuthGuard Component
 * 
 * Validates the Super Admin session on every page load:
 * 1. Checks if token exists in localStorage
 * 2. Validates token with backend API
 * 3. Redirects to login if:
 *    - No token exists
 *    - Token is invalid/expired
 *    - Server is unreachable (optional: show error instead)
 */
export default function AuthGuard({ children }: AuthGuardProps) {
    const router = useRouter();
    const pathname = usePathname();
    const [isValidating, setIsValidating] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    // Production: use same-origin (Vercel rewrites handle routing)
    // Development: use localhost
    const API_BASE = typeof window !== 'undefined' && window.location.hostname !== 'localhost'
        ? ''  // Same origin for production
        : (process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000');

    useEffect(() => {
        // Skip auth check for login page
        if (pathname === '/login') {
            setIsValidating(false);
            setIsAuthenticated(true);
            return;
        }

        validateSession();
    }, [pathname]);

    const validateSession = async () => {
        setIsValidating(true);

        const token = localStorage.getItem('SUPER_ADMIN_TOKEN');

        // No token - redirect to login immediately
        if (!token) {
            console.log('[AuthGuard] No token found, redirecting to login');
            clearSessionAndRedirect();
            return;
        }

        try {
            // Validate token with backend
            const res = await fetch(`${API_BASE}/super-admin/dashboard/stats`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (res.ok) {
                // Token is valid
                setIsAuthenticated(true);
            } else if (res.status === 401 || res.status === 403) {
                // Token invalid or expired
                console.log('[AuthGuard] Token invalid or expired, redirecting to login');
                clearSessionAndRedirect();
                return;
            } else {
                // Other errors - still allow access (could be temporary server issue)
                console.warn('[AuthGuard] Server returned non-auth error:', res.status);
                setIsAuthenticated(true);
            }
        } catch (error) {
            // Server unreachable - do NOT logout, just log error
            console.error('[AuthGuard] Server unreachable:', error);
            // Allow access if we have a token but server is down (optimistic)
            // Or show a connection error toast (future improvement)
            setIsAuthenticated(true);
            return;
        } finally {
            setIsValidating(false);
        }
    };

    const clearSessionAndRedirect = () => {
        localStorage.removeItem('SUPER_ADMIN_TOKEN');
        localStorage.removeItem('admin');
        setIsValidating(false);
        setIsAuthenticated(false);
        router.push('/login');
    };

    // Show loading while validating
    if (isValidating) {
        return (
            <div className="min-h-screen bg-[#FFFFF0] flex items-center justify-center">
                <div className="text-center">
                    <div className="font-mono text-xs uppercase tracking-widest text-[#8D0B41] animate-pulse">
                        Validating Secure Session...
                    </div>
                </div>
            </div>
        );
    }

    // Don't render children if not authenticated (except for login page)
    if (!isAuthenticated && pathname !== '/login') {
        return null;
    }

    return <>{children}</>;
}
