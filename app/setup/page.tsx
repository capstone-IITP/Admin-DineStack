'use client';

import { useSession, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { claimSuperAdmin } from "./actions";
import { Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";

export default function SetupPageClient() {
    const { isLoaded, session, isSignedIn } = useSession();
    const { user } = useUser();
    const router = useRouter();
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [msg, setMsg] = useState('');

    useEffect(() => {
        if (!isLoaded) return;

        if (!isSignedIn) {
            router.push('/sign-in');
            return;
        }

        const initSetup = async () => {
            // Check if we already have the role in the session (fast path)
            // We need to check publicMetadata or privateMetadata (not accessible in client usually unless publicly mapped)
            // But simpler: just run the server action. It checks backend truth.

            try {
                const result = await claimSuperAdmin();

                if (result.success) {
                    setStatus('success');
                    // CRITICAL: Reload session to convert backend metadata update into a new JWT
                    await session.reload();
                    // Now redirect
                    router.push('/');
                } else {
                    setStatus('error');
                    setMsg(result.message);
                }
            } catch (err: any) {
                setStatus('error');
                setMsg(err.message || 'Unknown error');
            }
        };

        // If usage has the role already, just go home
        // But session might be stale, so let's just run logic.
        // Optimization: check if user.publicMetadata.role === 'super_admin' if we exposed it. 
        // For now, robust path: always claim.
        initSetup();

    }, [isLoaded, isSignedIn, router, session]);

    if (status === 'error') {
        return (
            <div className="min-h-screen bg-[#FFFFF0] flex flex-col items-center justify-center p-4">
                <div className="bg-white p-8 rounded-2xl shadow-xl max-w-lg w-full text-center">
                    <div className="flex justify-center mb-6">
                        <div className="w-16 h-16 bg-red-100 flex items-center justify-center rounded-full">
                            <AlertTriangle className="text-red-600" size={32} />
                        </div>
                    </div>
                    <h1 className="text-2xl font-bold text-red-600 mb-2">Setup Failed</h1>
                    <p className="text-gray-600 mb-6">{msg}</p>
                    <button onClick={() => window.location.reload()} className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 text-sm font-bold uppercase tracking-wide">
                        Retry
                    </button>
                    <div className="mt-4">
                        <a href="/sign-in" className="text-xs text-gray-400 underline">Back to Sign In</a>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#FFFFF0] flex flex-col items-center justify-center p-4">
            <div className="flex flex-col items-center animate-pulse">
                <Loader2 className="w-12 h-12 text-[#8D0B41] animate-spin mb-4" />
                <h2 className="text-xl font-serif font-bold text-[#1F1F1F]">Setting Update</h2>
                <p className="font-mono text-xs uppercase tracking-widest text-gray-500 mt-2">
                    {status === 'success' ? 'Redirecting to Dashboard...' : 'Configuring Admin Permissions...'}
                </p>
            </div>
        </div>
    );
}
