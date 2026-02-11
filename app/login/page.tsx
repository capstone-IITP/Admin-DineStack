"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Shield, AlertTriangle, ArrowRight } from "lucide-react";

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        // Production: use same-origin (Vercel rewrites handle routing)
        // Development: use localhost
        const API_BASE = typeof window !== 'undefined' && window.location.hostname !== 'localhost'
            ? ''  // Same origin for production
            : (process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000');

        try {
            const res = await fetch(`${API_BASE}/super-admin/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password }),
            });

            // Safe JSON parsing to handle non-JSON responses (like HTML error pages)
            const text = await res.text();
            let data;
            try {
                data = JSON.parse(text);
            } catch {
                console.error("Non-JSON response from server:", text);
                throw new Error("Server returned an invalid response. Please check if the backend is running.");
            }

            if (!res.ok) {
                throw new Error(data.message || "Login failed");
            }

            // Store auth data
            localStorage.setItem("SUPER_ADMIN_TOKEN", data.token);
            localStorage.setItem("admin", JSON.stringify(data.admin));

            // Redirect to dashboard
            router.push("/");
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#FFFFF0] flex items-center justify-center p-6 text-[#1F1F1F] font-sans">
            <div className="w-full max-w-md">
                {/* Header */}
                <div className="mb-8 text-center">
                    <div className="flex justify-center -mb-2">
                        <Image
                            src="/assets/DineStack Bg Remove.png"
                            alt="DineStack Logo"
                            width={120}
                            height={120}
                            className="object-contain"
                        />
                    </div>
                    <h1 className="text-3xl font-serif font-bold tracking-tight mb-2">DINESTACK</h1>
                    <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#8D0B41]">Internal Console Access</p>
                </div>

                {/* Login Card */}
                <div className="bg-white border-2 border-[#1F1F1F] shadow-[8px_8px_0px_0px_#1F1F1F] p-8 relative">
                    {/* Decorative Corner */}
                    <div className="absolute top-0 right-0 w-4 h-4 bg-[#8D0B41]"></div>

                    <form onSubmit={handleLogin} className="space-y-6">
                        {error && (
                            <div className="bg-red-50 border border-[#8D0B41] p-3 flex items-start gap-3">
                                <AlertTriangle className="text-[#8D0B41] shrink-0" size={16} />
                                <p className="font-mono text-xs text-[#8D0B41] uppercase tracking-wide">{error}</p>
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="block font-mono text-xs font-bold uppercase tracking-widest text-[#6A6A6A]">
                                Operator ID
                            </label>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-[#FFFFF0] border border-[#1F1F1F] px-4 py-3 font-serif placeholder:text-gray-400 focus:outline-none focus:border-[#8D0B41] focus:shadow-[2px_2px_0px_0px_#8D0B41] transition-all"
                                placeholder="admin@dinestack.in"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="block font-mono text-xs font-bold uppercase tracking-widest text-[#6A6A6A]">
                                Passcode
                            </label>
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-[#FFFFF0] border border-[#1F1F1F] px-4 py-3 font-serif placeholder:text-gray-400 focus:outline-none focus:border-[#8D0B41] focus:shadow-[2px_2px_0px_0px_#8D0B41] transition-all"
                                placeholder="••••••••"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-[#1F1F1F] text-white font-mono text-sm font-bold uppercase tracking-widest py-4 border border-[#1F1F1F] hover:bg-[#333] active:translate-y-1 active:shadow-none shadow-[4px_4px_0px_0px_#8D0B41] transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {loading ? "Authenticating..." : "Initialize Session"}
                            {!loading && <ArrowRight size={16} />}
                        </button>
                    </form>
                </div>

                {/* Footer */}
                <div className="mt-8 text-center space-y-2">
                    <p className="font-mono text-[10px] text-[#6A6A6A] uppercase">
                        System ID: NODE-8841-A
                    </p>
                    <div className="flex justify-center gap-1">
                        <span className="w-1.5 h-1.5 bg-[#1F1F1F] rounded-full opacity-20"></span>
                        <span className="w-1.5 h-1.5 bg-[#1F1F1F] rounded-full opacity-20"></span>
                        <span className="w-1.5 h-1.5 bg-[#8D0B41] rounded-full opacity-40"></span>
                    </div>
                </div>
            </div>
        </div>
    );
}
