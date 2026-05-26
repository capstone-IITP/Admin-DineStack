"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Shield, ShieldOff, KeyRound, AlertTriangle, Download, Loader2 } from "lucide-react";

interface TwoFactorSettingsProps {
    apiBase: string;
    fetchWithAuth: (url: string, options?: RequestInit) => Promise<Response>;
}

type Step = "idle" | "loading" | "qr" | "verifying" | "backup-codes" | "disabling";

export default function TwoFactorSettings({ apiBase, fetchWithAuth }: TwoFactorSettingsProps) {
    const [enabled, setEnabled] = useState(false);
    const [enabledAt, setEnabledAt] = useState<string | null>(null);
    const [backupCodesRemaining, setBackupCodesRemaining] = useState(0);
    const [step, setStep] = useState<Step>("idle");
    const [error, setError] = useState("");

    // Setup flow state
    const [qrCode, setQrCode] = useState("");
    const [manualKey, setManualKey] = useState("");
    const [setupOtp, setSetupOtp] = useState("");
    const [backupCodes, setBackupCodes] = useState<string[]>([]);

    // Disable flow state
    const [disablePassword, setDisablePassword] = useState("");
    const [disableOtp, setDisableOtp] = useState("");

    const fetchStatus = useCallback(async () => {
        try {
            const res = await fetchWithAuth(`${apiBase}/super-admin/2fa/status`);
            if (res.ok) {
                const data = await res.json();
                setEnabled(data.enabled);
                setEnabledAt(data.enabledAt);
                setBackupCodesRemaining(data.backupCodesRemaining || 0);
            }
        } catch (err) {
            console.warn("Failed to fetch 2FA status:", err);
        }
    }, [apiBase, fetchWithAuth]);

    useEffect(() => {
        fetchStatus();
    }, [fetchStatus]);

    // --- ENABLE: Step 1 — Generate QR ---
    const handleSetup = async () => {
        setStep("loading");
        setError("");
        try {
            const res = await fetchWithAuth(`${apiBase}/super-admin/2fa/setup`, {
                method: "POST",
                headers: { "Content-Type": "application/json" }
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message);

            setQrCode(data.qrCode);
            setManualKey(data.manualKey);
            setStep("qr");
        } catch (err: any) {
            setError(err.message);
            setStep("idle");
        }
    };

    // --- ENABLE: Step 2 — Verify first OTP ---
    const handleVerifySetup = async (e: React.FormEvent) => {
        e.preventDefault();
        setStep("verifying");
        setError("");
        try {
            const res = await fetchWithAuth(`${apiBase}/super-admin/2fa/verify-setup`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ otp: setupOtp })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message);

            setBackupCodes(data.backupCodes);
            setEnabled(true);
            setStep("backup-codes");
            setSetupOtp("");
        } catch (err: any) {
            setError(err.message);
            setStep("qr"); // Go back to QR step
        }
    };

    // --- DISABLE ---
    const handleDisable = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        try {
            const res = await fetchWithAuth(`${apiBase}/super-admin/2fa/disable`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ password: disablePassword, otp: disableOtp })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message);

            setEnabled(false);
            setEnabledAt(null);
            setBackupCodesRemaining(0);
            setStep("idle");
            setDisablePassword("");
            setDisableOtp("");
        } catch (err: any) {
            setError(err.message);
        }
    };

    const downloadBackupCodes = () => {
        const text = "DineStack 2FA Backup Codes\n" +
            "Generated: " + new Date().toLocaleString() + "\n" +
            "Each code can only be used once.\n\n" +
            backupCodes.map((code, i) => `${i + 1}. ${code}`).join("\n") + "\n";
        const blob = new Blob([text], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "dinestack-2fa-backup-codes.txt";
        a.click();
        URL.revokeObjectURL(url);
    };

    // =====================================================================
    // RENDER
    // =====================================================================

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex justify-between items-end mb-8 pb-4 border-b-2 border-[#1F1F1F]">
                <div>
                    <h2 className="text-3xl font-serif font-bold text-[#1F1F1F] tracking-tight">Two-Factor Auth</h2>
                    <div className="text-[#6A6A6A] font-mono text-xs uppercase tracking-wider mt-2 flex items-center gap-2">
                        <span className="w-2 h-2 bg-[#8D0B41]"></span>
                        TOTP-Based Account Security
                    </div>
                </div>
            </div>

            {/* Error display */}
            {error && (
                <div className="bg-red-50 border border-[#8D0B41] p-4 flex items-start gap-3">
                    <AlertTriangle className="text-[#8D0B41] shrink-0 mt-0.5" size={16} />
                    <p className="font-mono text-xs text-[#8D0B41] uppercase tracking-wide">{error}</p>
                </div>
            )}

            {/* STATUS CARD */}
            <div className="bg-white border border-[#1F1F1F] shadow-[4px_4px_0px_0px_rgba(31,31,31,0.1)]">
                <div className="bg-[#FFFFF0] border-b border-[#1F1F1F] px-4 py-2 flex justify-between items-center">
                    <h3 className="text-[10px] font-bold text-[#1F1F1F] uppercase tracking-widest font-mono">Security Status</h3>
                    <div className="flex gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#1F1F1F] opacity-20"></div>
                        <div className="w-1.5 h-1.5 rounded-full bg-[#1F1F1F] opacity-20"></div>
                        <div className="w-1.5 h-1.5 rounded-full bg-[#1F1F1F] opacity-20"></div>
                    </div>
                </div>
                <div className="p-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 flex items-center justify-center ${enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                                {enabled ? <Shield size={24} /> : <ShieldOff size={24} />}
                            </div>
                            <div>
                                <p className="font-serif text-lg font-bold text-[#1F1F1F]">
                                    {enabled ? "2FA is Active" : "2FA is Disabled"}
                                </p>
                                {enabled && enabledAt && (
                                    <p className="font-mono text-[10px] text-[#6A6A6A] uppercase tracking-wide mt-1">
                                        Enabled: {new Date(enabledAt).toLocaleDateString()} · {backupCodesRemaining} backup codes remaining
                                    </p>
                                )}
                                {!enabled && (
                                    <p className="font-mono text-[10px] text-[#6A6A6A] uppercase tracking-wide mt-1">
                                        Protect your account with time-based one-time passwords
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Action buttons (idle state only) */}
                        {step === "idle" && (
                            <div>
                                {!enabled ? (
                                    <button
                                        onClick={handleSetup}
                                        className="px-6 py-3 text-xs font-bold uppercase tracking-widest bg-[#1F1F1F] text-white border border-[#1F1F1F] hover:bg-[#333] shadow-[2px_2px_0px_0px_#8D0B41] transition-all active:translate-y-0.5 active:shadow-none"
                                    >
                                        Enable 2FA
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => { setStep("disabling"); setError(""); }}
                                        className="px-6 py-3 text-xs font-bold uppercase tracking-widest bg-[#8D0B41] text-white border-[#8D0B41] border hover:bg-[#700833] shadow-[2px_2px_0px_0px_#1F1F1F] transition-all active:translate-y-0.5 active:shadow-none"
                                    >
                                        Disable 2FA
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* LOADING */}
            {step === "loading" && (
                <div className="bg-white border border-[#1F1F1F] p-12 text-center">
                    <Loader2 size={32} className="animate-spin mx-auto text-[#8D0B41] mb-4" />
                    <p className="font-mono text-xs uppercase tracking-widest text-[#6A6A6A]">Generating secure key...</p>
                </div>
            )}

            {/* QR CODE + MANUAL KEY */}
            {step === "qr" && (
                <div className="bg-white border border-[#1F1F1F] shadow-[4px_4px_0px_0px_rgba(31,31,31,0.1)]">
                    <div className="bg-[#1F1F1F] text-white px-4 py-3">
                        <h3 className="text-[10px] font-bold uppercase tracking-widest font-mono flex items-center gap-2">
                            <KeyRound size={14} />
                            Step 1: Scan QR Code
                        </h3>
                    </div>
                    <div className="p-8">
                        <div className="grid grid-cols-2 gap-8">
                            {/* QR Code */}
                            <div className="flex flex-col items-center">
                                <div className="bg-white border-2 border-[#1F1F1F] p-4 mb-4">
                                    <img src={qrCode} alt="2FA QR Code" className="w-48 h-48" />
                                </div>
                                <p className="font-mono text-[10px] text-[#6A6A6A] uppercase text-center">
                                    Scan with Google Authenticator, Authy, or similar app
                                </p>
                            </div>

                            {/* Manual key + OTP input */}
                            <div className="space-y-6">
                                <div>
                                    <label className="block font-mono text-[10px] font-bold uppercase tracking-widest text-[#6A6A6A] mb-2">
                                        Manual Entry Key
                                    </label>
                                    <div className="bg-[#FFFFF0] border border-[#1F1F1F] p-3 font-mono text-sm break-all select-all">
                                        {manualKey}
                                    </div>
                                    <p className="font-mono text-[10px] text-[#8D0B41] mt-2">
                                        ⚠ This key will NOT be shown again
                                    </p>
                                </div>

                                <form onSubmit={handleVerifySetup} className="space-y-4">
                                    <div>
                                        <label className="block font-mono text-[10px] font-bold uppercase tracking-widest text-[#6A6A6A] mb-2">
                                            Step 2: Enter 6-Digit Code
                                        </label>
                                        <input
                                            type="text"
                                            value={setupOtp}
                                            onChange={(e) => setSetupOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                            className="w-full bg-[#FFFFF0] border border-[#1F1F1F] px-4 py-3 font-mono text-xl text-center tracking-[0.4em] placeholder:text-gray-300 focus:outline-none focus:border-[#8D0B41] focus:shadow-[2px_2px_0px_0px_#8D0B41] transition-all"
                                            placeholder="000000"
                                            maxLength={6}
                                            autoFocus
                                        />
                                    </div>
                                    <div className="flex gap-3">
                                        <button
                                            type="submit"
                                            disabled={setupOtp.length !== 6}
                                            className="flex-1 px-6 py-3 text-xs font-bold uppercase tracking-widest bg-[#1F1F1F] text-white border border-[#1F1F1F] hover:bg-[#333] shadow-[2px_2px_0px_0px_#8D0B41] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            Verify & Enable
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => { setStep("idle"); setQrCode(""); setManualKey(""); setSetupOtp(""); setError(""); }}
                                            className="px-6 py-3 text-xs font-bold uppercase tracking-widest bg-white text-[#1F1F1F] border border-[#1F1F1F] hover:bg-[#FFFFF0] transition-all"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* VERIFYING SPINNER */}
            {step === "verifying" && (
                <div className="bg-white border border-[#1F1F1F] p-12 text-center">
                    <Loader2 size={32} className="animate-spin mx-auto text-[#8D0B41] mb-4" />
                    <p className="font-mono text-xs uppercase tracking-widest text-[#6A6A6A]">Verifying code & generating backup codes...</p>
                </div>
            )}

            {/* BACKUP CODES (shown after successful setup) */}
            {step === "backup-codes" && (
                <div className="bg-white border-2 border-[#8D0B41] shadow-[4px_4px_0px_0px_#8D0B41]">
                    <div className="bg-[#8D0B41] text-white px-4 py-3">
                        <h3 className="text-[10px] font-bold uppercase tracking-widest font-mono flex items-center gap-2">
                            <Shield size={14} />
                            2FA Enabled — Save Your Backup Codes
                        </h3>
                    </div>
                    <div className="p-8">
                        <div className="bg-orange-50 border-l-4 border-orange-500 p-4 mb-6">
                            <p className="font-mono text-xs text-orange-800 font-bold uppercase tracking-wide mb-1">
                                ⚠ One-Time Display
                            </p>
                            <p className="font-mono text-[10px] text-orange-700">
                                These backup codes will NOT be shown again. Save them in a secure location. Each code can only be used once.
                            </p>
                        </div>

                        <div className="grid grid-cols-4 gap-3 mb-6">
                            {backupCodes.map((code, i) => (
                                <div key={i} className="bg-[#FFFFF0] border border-[#1F1F1F] p-3 text-center font-mono text-sm font-bold tracking-wider select-all">
                                    {code}
                                </div>
                            ))}
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={downloadBackupCodes}
                                className="flex items-center gap-2 px-6 py-3 text-xs font-bold uppercase tracking-widest bg-white text-[#1F1F1F] border border-[#1F1F1F] hover:bg-[#FFFFF0] transition-all"
                            >
                                <Download size={14} />
                                Download
                            </button>
                            <button
                                onClick={() => { setStep("idle"); setBackupCodes([]); fetchStatus(); }}
                                className="flex-1 px-6 py-3 text-xs font-bold uppercase tracking-widest bg-[#1F1F1F] text-white border border-[#1F1F1F] hover:bg-[#333] shadow-[2px_2px_0px_0px_#8D0B41] transition-all"
                            >
                                I&apos;ve Saved My Codes — Done
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* DISABLE 2FA FORM */}
            {step === "disabling" && (
                <div className="bg-white border border-[#1F1F1F] shadow-[4px_4px_0px_0px_rgba(31,31,31,0.1)]">
                    <div className="bg-[#1F1F1F] text-white px-4 py-3">
                        <h3 className="text-[10px] font-bold uppercase tracking-widest font-mono flex items-center gap-2">
                            <ShieldOff size={14} />
                            Disable Two-Factor Authentication
                        </h3>
                    </div>
                    <div className="p-8">
                        <div className="bg-red-50 border-l-4 border-[#8D0B41] p-4 mb-6">
                            <p className="font-mono text-xs text-[#8D0B41] font-bold uppercase tracking-wide mb-1">
                                Security Warning
                            </p>
                            <p className="font-mono text-[10px] text-[#8D0B41]">
                                Disabling 2FA reduces your account security. You must verify your identity to continue.
                            </p>
                        </div>

                        <form onSubmit={handleDisable} className="space-y-4 max-w-md">
                            <div>
                                <label className="block font-mono text-[10px] font-bold uppercase tracking-widest text-[#6A6A6A] mb-2">
                                    Current Password
                                </label>
                                <input
                                    type="password"
                                    value={disablePassword}
                                    onChange={(e) => setDisablePassword(e.target.value)}
                                    required
                                    className="w-full bg-[#FFFFF0] border border-[#1F1F1F] px-4 py-3 font-serif placeholder:text-gray-400 focus:outline-none focus:border-[#8D0B41] focus:shadow-[2px_2px_0px_0px_#8D0B41] transition-all"
                                    placeholder="Enter your password"
                                />
                            </div>
                            <div>
                                <label className="block font-mono text-[10px] font-bold uppercase tracking-widest text-[#6A6A6A] mb-2">
                                    Current OTP Code
                                </label>
                                <input
                                    type="text"
                                    value={disableOtp}
                                    onChange={(e) => setDisableOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                    required
                                    className="w-full bg-[#FFFFF0] border border-[#1F1F1F] px-4 py-3 font-mono text-xl text-center tracking-[0.4em] placeholder:text-gray-300 focus:outline-none focus:border-[#8D0B41] focus:shadow-[2px_2px_0px_0px_#8D0B41] transition-all"
                                    placeholder="000000"
                                    maxLength={6}
                                />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button
                                    type="submit"
                                    disabled={!disablePassword || disableOtp.length !== 6}
                                    className="px-6 py-3 text-xs font-bold uppercase tracking-widest bg-[#8D0B41] text-white border-[#8D0B41] border hover:bg-[#700833] shadow-[2px_2px_0px_0px_#1F1F1F] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Confirm Disable
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setStep("idle"); setDisablePassword(""); setDisableOtp(""); setError(""); }}
                                    className="px-6 py-3 text-xs font-bold uppercase tracking-widest bg-white text-[#1F1F1F] border border-[#1F1F1F] hover:bg-[#FFFFF0] transition-all"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
