"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import * as api from "../services/api";

interface AuthGuardProps {
    children: React.ReactNode;
}

/**
 * AuthGuard Component
 * 
 * Validates the Super Admin session on every page load:
 * 1. Checks verification status with backend via cookies
 * 2. Attempts silent refresh if session is expired
 * 3. Redirects to login if unauthenticated or refresh fails
 */
export default function AuthGuard({ children }: AuthGuardProps) {
    const router = useRouter();
    const pathname = usePathname();
    const [isValidating, setIsValidating] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    const API_BASE = api.getApiBase();

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

        try {
            // Validate session cookies with backend verify endpoint
            const res = await fetch(`${API_BASE}/super-admin/verify`, {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (res.ok) {
                const data = await res.json();
                if (data.admin) {
                    localStorage.setItem('admin', JSON.stringify(data.admin));
                }
                setIsAuthenticated(true);
            } else if (res.status === 401 || res.status === 403) {
                const clone = res.clone();
                const body = await clone.json().catch(() => ({}));
                
                // If token has expired, try a silent refresh
                if (body.code === 'TOKEN_EXPIRED') {
                    console.log('[AuthGuard] Token expired. Attempting cookie refresh...');
                    const refreshRes = await fetch(`${API_BASE}/super-admin/refresh`, {
                        method: 'POST',
                        credentials: 'include'
                    });

                    if (refreshRes.ok) {
                        // Retry original verification
                        const retryRes = await fetch(`${API_BASE}/super-admin/verify`, {
                            method: 'GET',
                            credentials: 'include'
                        });

                        if (retryRes.ok) {
                            const data = await retryRes.json();
                            if (data.admin) {
                                localStorage.setItem('admin', JSON.stringify(data.admin));
                            }
                            setIsAuthenticated(true);
                            setIsValidating(false);
                            return;
                        }
                    }
                }

                console.log('[AuthGuard] Verification failed. Redirecting to login.');
                clearSessionAndRedirect();
                return;
            } else {
                console.warn('[AuthGuard] Server returned non-auth error:', res.status);
                setIsAuthenticated(true);
            }
        } catch (error) {
            console.warn('[AuthGuard] Server unreachable:', error);
            // Allow access optimistically if we have profile data, otherwise block
            if (localStorage.getItem('admin')) {
                setIsAuthenticated(true);
            } else {
                clearSessionAndRedirect();
                return;
            }
        } finally {
            setIsValidating(false);
        }
    };

    const clearSessionAndRedirect = () => {
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
