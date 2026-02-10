'use client';

import { useSession } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { claimSuperAdmin } from "./actions";
import { Loader2, AlertTriangle, RefreshCw } from "lucide-react";

export default function SetupProcess() {
    const { session, isLoaded } = useSession();
    const router = useRouter();
    const [status, setStatus] = useState<'initializing' | 'claiming' | 'refreshing' | 'success' | 'error'>('initializing');
    const [msg, setMsg] = useState('');

    useEffect(() => {
        if (!isLoaded) return;

        const runSetup = async () => {
            try {
                setStatus('claiming');
                const result = await claimSuperAdmin();

                if (result.success) {
                    setStatus('refreshing');
                    // CRITICAL: Reload session to convert backend metadata update into a new JWT
                    if (session) {
                        await session.reload();
                    }

                    setStatus('success');
                    // Now redirect
                    router.push('/');
                } else {
                    // If already admin, just go home
                    if (result.message === 'Already admin') {
                        router.push('/');
                        return;
                    }
                    setStatus('error');
                    setMsg(result.message);
                }
            } catch (err: any) {
                setStatus('error');
                setMsg(err.message || 'Unknown error');
            }
        };

        runSetup();
    }, [isLoaded, router, session]);

    if (status === 'error') {
        return (
            <div className="bg-white p-8 rounded-2xl shadow-xl max-w-lg w-full text-center mx-auto mt-20">
                <div className="flex justify-center mb-6">
                    <div className="w-16 h-16 bg-red-100 flex items-center justify-center rounded-full">
                        <AlertTriangle className="text-red-600" size={32} />
                    </div>
                </div>
                <h1 className="text-2xl font-bold text-red-600 mb-2">Setup Failed</h1>
                <p className="text-gray-600 mb-6">{msg}</p>
                <div className="flex justify-center gap-4">
                    <button onClick={() => window.location.reload()} className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 text-sm font-bold uppercase tracking-wide">
                        Retry
                    </button>
                    <a href="/sign-in" className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 text-sm font-bold uppercase tracking-wide">
                        Back to Login
                    </a>
                </div>
            </div>
        );
    }

    // Status messages for the different states
    const statusText = {
        initializing: 'Initializing Setup...',
        claiming: 'Assigning Permissions...',
        refreshing: 'Updating Session...',
        success: 'Redirecting to Dashboard...',
        error: 'Failed'
    }[status];

    return (
        <div className="flex flex-col items-center animate-pulse">
            <Loader2 className="w-12 h-12 text-[#8D0B41] animate-spin mb-4" />
            <h2 className="text-xl font-serif font-bold text-[#1F1F1F]">System Setup</h2>
            <p className="font-mono text-xs uppercase tracking-widest text-gray-500 mt-2">
                {statusText}
            </p>
        </div>
    );
}
