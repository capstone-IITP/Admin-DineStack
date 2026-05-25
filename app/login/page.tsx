"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Shield, AlertTriangle, ArrowRight, Lock, KeyRound } from "lucide-react";

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [lockInfo, setLockInfo] = useState<{ locked: boolean; retryAfterMinutes?: number } | null>(null);
    const [loading, setLoading] = useState(false);

    // 2FA state
    const [requires2FA, setRequires2FA] = useState(false);
    const [tempToken, setTempToken] = useState("");
    const [otp, setOtp] = useState("");
    const [otpError, setOtpError] = useState("");
    const [otpLoading, setOtpLoading] = useState(false);
    const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(null);
    const [otpBlocked, setOtpBlocked] = useState<{ blocked: boolean; retryAfterMinutes?: number } | null>(null);

    // Production: use same-origin (Vercel rewrites handle routing)
    // Development: use localhost
    const API_BASE = typeof window !== 'undefined' && window.location.hostname !== 'localhost'
        ? ''  // Same origin for production
        : (process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000');

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLockInfo(null);
        setLoading(true);

        try {
            const res = await fetch(`${API_BASE}/super-admin/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ email, password }),
            });

            const text = await res.text();
            let data;
            try {
                data = JSON.parse(text);
            } catch {
                console.error("Non-JSON response from server:", text);
                throw new Error("Server returned an invalid response. Please check if the backend is running.");
            }

            // Handle account lockout (423)
            if (res.status === 423) {
                setLockInfo({
                    locked: true,
                    retryAfterMinutes: data.retryAfterMinutes || 15
                });
                return;
            }

            if (!res.ok) {
                throw new Error(data.message || "Login failed");
            }

            // Check if 2FA is required
            if (data.requires2FA) {
                setRequires2FA(true);
                setTempToken(data.tempToken);
                return;
            }

            // No 2FA — normal login
            localStorage.setItem("SUPER_ADMIN_TOKEN", data.token);
            localStorage.setItem("admin", JSON.stringify(data.admin));
            router.push("/");
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOTP = async (e: React.FormEvent) => {
        e.preventDefault();
        setOtpError("");
        setOtpBlocked(null);
        setOtpLoading(true);

        try {
            const res = await fetch(`${API_BASE}/super-admin/2fa/verify-login`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${tempToken}`
                },
                credentials: "include",
                body: JSON.stringify({ otp }),
            });

            const text = await res.text();
            let data;
            try {
                data = JSON.parse(text);
            } catch {
                throw new Error("Server returned an invalid response.");
            }

            // OTP rate limit block
            if (res.status === 423) {
                setOtpBlocked({
                    blocked: true,
                    retryAfterMinutes: data.retryAfterMinutes || 10
                });
                return;
            }

            // Temp token expired — go back to login
            if (res.status === 401 && (data.code === "TEMP_TOKEN_EXPIRED" || data.code === "TEMP_TOKEN_INVALID")) {
                setRequires2FA(false);
                setTempToken("");
                setOtp("");
                setError("Verification session expired. Please login again.");
                return;
            }

            if (!res.ok) {
                setAttemptsRemaining(data.attemptsRemaining ?? null);
                throw new Error(data.message || "Verification failed");
            }

            // Success — store auth data
            localStorage.setItem("SUPER_ADMIN_TOKEN", data.token);
            localStorage.setItem("admin", JSON.stringify(data.admin));
            router.push("/");
        } catch (err: any) {
            setOtpError(err.message);
        } finally {
            setOtpLoading(false);
        }
    };

    const handleBackToLogin = () => {
        setRequires2FA(false);
        setTempToken("");
        setOtp("");
        setOtpError("");
        setOtpBlocked(null);
        setAttemptsRemaining(null);
        setError("");
    };

    // --- OTP VERIFICATION SCREEN ---
    if (requires2FA) {
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
                        <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#8D0B41]">Two-Factor Verification</p>
                    </div>

                    {/* OTP Card */}
                    <div className="bg-white border-2 border-[#1F1F1F] shadow-[8px_8px_0px_0px_#1F1F1F] p-8 relative">
                        <div className="absolute top-0 right-0 w-4 h-4 bg-[#8D0B41]"></div>

                        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-200">
                            <div className="w-10 h-10 bg-[#8D0B41] text-white flex items-center justify-center">
                                <KeyRound size={20} />
                            </div>
                            <div>
                                <p className="font-mono text-xs font-bold uppercase tracking-wide text-[#1F1F1F]">
                                    Authentication Required
                                </p>
                                <p className="font-mono text-[10px] text-[#6A6A6A] mt-0.5">
                                    Enter the 6-digit code from your authenticator app or a backup code
                                </p>
                            </div>
                        </div>

                        <form onSubmit={handleVerifyOTP} className="space-y-6">
                            {/* OTP Blocked Warning */}
                            {otpBlocked?.blocked && (
                                <div className="bg-orange-50 border-2 border-orange-400 p-4 flex items-start gap-3">
                                    <Lock className="text-orange-600 shrink-0 mt-0.5" size={18} />
                                    <div>
                                        <p className="font-mono text-xs text-orange-800 font-bold uppercase tracking-wide mb-1">
                                            Too Many Failed Attempts
                                        </p>
                                        <p className="font-mono text-[10px] text-orange-700">
                                            Please try again in{' '}
                                            <span className="font-bold">{otpBlocked.retryAfterMinutes} minute{otpBlocked.retryAfterMinutes !== 1 ? 's' : ''}</span>.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* OTP Error */}
                            {otpError && !otpBlocked?.blocked && (
                                <div className="bg-red-50 border border-[#8D0B41] p-3 flex items-start gap-3">
                                    <AlertTriangle className="text-[#8D0B41] shrink-0" size={16} />
                                    <div>
                                        <p className="font-mono text-xs text-[#8D0B41] uppercase tracking-wide">{otpError}</p>
                                        {attemptsRemaining !== null && (
                                            <p className="font-mono text-[10px] text-[#8D0B41] mt-1 opacity-70">
                                                {attemptsRemaining} attempt{attemptsRemaining !== 1 ? 's' : ''} remaining
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}

                            <div className="space-y-2">
                                <label className="block font-mono text-xs font-bold uppercase tracking-widest text-[#6A6A6A]">
                                    Verification Code
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                    className="w-full bg-[#FFFFF0] border border-[#1F1F1F] px-4 py-4 font-mono text-2xl text-center tracking-[0.5em] placeholder:text-gray-300 placeholder:tracking-[0.3em] placeholder:text-base focus:outline-none focus:border-[#8D0B41] focus:shadow-[2px_2px_0px_0px_#8D0B41] transition-all"
                                    placeholder="000000"
                                    maxLength={6}
                                    autoFocus
                                    autoComplete="one-time-code"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={otpLoading || otpBlocked?.blocked || !otp}
                                className="w-full bg-[#1F1F1F] text-white font-mono text-sm font-bold uppercase tracking-widest py-4 border border-[#1F1F1F] hover:bg-[#333] active:translate-y-1 active:shadow-none shadow-[4px_4px_0px_0px_#8D0B41] transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                {otpLoading ? "Verifying..." : "Verify & Continue"}
                                {!otpLoading && <Shield size={16} />}
                            </button>

                            <button
                                type="button"
                                onClick={handleBackToLogin}
                                className="w-full text-center font-mono text-[10px] text-[#6A6A6A] uppercase tracking-widest hover:text-[#8D0B41] transition-colors py-2"
                            >
                                ← Back to Login
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
                            <span className="w-1.5 h-1.5 bg-[#8D0B41] rounded-full opacity-40"></span>
                            <span className="w-1.5 h-1.5 bg-[#8D0B41] rounded-full opacity-40"></span>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // --- NORMAL LOGIN SCREEN ---
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
                        {/* Account Locked Warning */}
                        {lockInfo?.locked && (
                            <div className="bg-orange-50 border-2 border-orange-400 p-4 flex items-start gap-3">
                                <Lock className="text-orange-600 shrink-0 mt-0.5" size={18} />
                                <div>
                                    <p className="font-mono text-xs text-orange-800 font-bold uppercase tracking-wide mb-1">
                                        Account Temporarily Locked
                                    </p>
                                    <p className="font-mono text-[10px] text-orange-700">
                                        Too many failed login attempts. Please try again in{' '}
                                        <span className="font-bold">{lockInfo.retryAfterMinutes} minute{lockInfo.retryAfterMinutes !== 1 ? 's' : ''}</span>.
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Error Alert */}
                        {error && !lockInfo?.locked && (
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
                            disabled={loading || lockInfo?.locked}
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
