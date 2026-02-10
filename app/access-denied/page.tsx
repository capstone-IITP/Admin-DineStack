import { ShieldAlert } from "lucide-react";
import Link from "next/link";

export default function AccessDenied() {
    return (
        <div className="min-h-screen bg-[#FFFFF0] flex flex-col items-center justify-center p-4">
            <div className="text-center animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="flex justify-center mb-6">
                    <div className="w-20 h-20 bg-[#8D0B41] flex items-center justify-center rounded-full shadow-lg">
                        <ShieldAlert className="text-white" size={40} />
                    </div>
                </div>

                <h1 className="text-4xl font-serif font-bold tracking-tight text-[#1F1F1F] mb-4">
                    Access Denied
                </h1>

                <div className="flex items-center justify-center gap-3 mb-6">
                    <div className="h-px bg-[#1F1F1F] w-12 opacity-20"></div>
                    <p className="font-mono text-sm uppercase tracking-[0.2em] text-[#8D0B41] font-bold">
                        Restricted Area
                    </p>
                    <div className="h-px bg-[#1F1F1F] w-12 opacity-20"></div>
                </div>

                <p className="text-[#6A6A6A] max-w-md mx-auto mb-8 leading-relaxed">
                    You authenticate successfully, but your account does not have the required
                    <span className="font-mono text-[#1F1F1F] bg-gray-200 px-1 mx-1 rounded text-sm">super_admin</span>
                    privileges to access this console.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Link
                        href="/sign-in"
                        className="px-6 py-3 bg-[#1F1F1F] text-white font-mono text-xs uppercase tracking-widest hover:bg-[#333] transition-colors"
                    >
                        Switch Account
                    </Link>
                </div>
            </div>

            <div className="mt-16 opacity-30">
                <p className="font-mono text-[10px] uppercase tracking-widest text-[#1F1F1F]">
                    DineStack Security System
                </p>
            </div>
        </div>
    );
}
