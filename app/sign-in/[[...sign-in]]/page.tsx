import { SignIn } from "@clerk/nextjs";
import { Terminal } from "lucide-react";

export default function Page() {
    return (
        <div className="min-h-screen bg-[#FFFFF0] flex flex-col items-center justify-center p-4">

            {/* Brand Header */}
            <div className="mb-8 text-center animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="flex justify-center mb-4">
                    <div className="w-16 h-16 bg-[#1F1F1F] flex items-center justify-center border-2 border-[#8D0B41] shadow-[4px_4px_0px_0px_#8D0B41]">
                        <Terminal className="text-white" size={32} />
                    </div>
                </div>
                <h1 className="text-3xl font-serif font-bold tracking-tight text-[#1F1F1F] mb-2">DINESTACK</h1>
                <div className="flex items-center justify-center gap-3">
                    <div className="h-px bg-[#1F1F1F] w-8"></div>
                    <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#8D0B41]">Internal Console</p>
                    <div className="h-px bg-[#1F1F1F] w-8"></div>
                </div>
            </div>

            {/* Clerk Component Wrapper */}
            <div className="w-full max-w-md">
                <SignIn
                    appearance={{
                        elements: {
                            footer: "hidden",
                            footerAction: "hidden",
                            footerActionLink: "hidden"
                        }
                    }}
                />
            </div>

            {/* Footer */}
            <div className="mt-12 text-center opacity-40 hover:opacity-100 transition-opacity">
                <p className="font-mono text-[10px] uppercase tracking-widest text-[#1F1F1F]">
                    Secure Administrative Access Point
                </p>
                <p className="font-mono text-[10px] text-[#6A6A6A] mt-1">
                    v2.0.0 • SYSTEM ACTIVE
                </p>
            </div>

            {/* Background Decor */}
            <div className="fixed top-0 left-0 w-full h-2 bg-[#1F1F1F]"></div>
            <div className="fixed bottom-0 left-0 w-full h-2 bg-[#8D0B41]"></div>
        </div>
    );
}
