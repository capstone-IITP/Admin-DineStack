import { auth, clerkClient } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { CheckCircle2, ShieldCheck, AlertTriangle, Loader2 } from "lucide-react";
import { SignIn } from "@clerk/nextjs";

export default async function SetupPage() {
    const { userId, sessionClaims } = await auth();

    // 1. If not logged in, go to sign-in
    if (!userId) {
        redirect('/sign-in');
    }

    let status = 'loading';
    let errorMessage = '';

    try {
        // 2. Check if already has role (Backend Check)
        const client = await clerkClient();

        // Wrap API calls to catch configuration errors (e.g., missing API keys)
        let user;
        try {
            user = await client.users.getUser(userId);
        } catch (e: any) {
            console.error("Clerk getUser failed:", e);
            throw new Error(`Failed to fetch user data: ${e.message}`);
        }

        const existingRole = (user.privateMetadata as any)?.role;

        if (existingRole === 'super_admin') {
            status = 'needs_relogin';
        } else {
            // 3. System Check: Is this the first user?
            const userList = await client.users.getUserList({ limit: 2 });
            const isFirstUser = userList.totalCount === 1;

            if (isFirstUser) {
                try {
                    await client.users.updateUserMetadata(userId, {
                        privateMetadata: {
                            role: 'super_admin'
                        }
                    });
                    status = 'success';
                } catch (error: any) {
                    console.error("Failed to assign role:", error);
                    status = 'error';
                    errorMessage = error.message || "Failed to update user metadata";
                }
            } else {
                status = 'lockdown';
            }
        }
    } catch (error: any) {
        console.error("Setup page error:", error);
        status = 'error';
        errorMessage = error.message || "An unexpected error occurred during setup.";
    }

    // --- UI RENDER LOGIC ---

    const Container = ({ children }: { children: React.ReactNode }) => (
        <div className="min-h-screen bg-[#FFFFF0] flex flex-col items-center justify-center p-4">
            <div className="text-center animate-in fade-in zoom-in duration-500 bg-white p-8 rounded-2xl shadow-xl max-w-lg w-full">
                {children}
            </div>
        </div>
    );

    if (status === 'needs_relogin') {
        return (
            <Container>
                <div className="flex justify-center mb-6">
                    <div className="w-20 h-20 bg-blue-600 flex items-center justify-center rounded-full shadow-lg">
                        <ShieldCheck className="text-white" size={40} />
                    </div>
                </div>
                <h1 className="text-3xl font-serif font-bold text-[#1F1F1F] mb-4">
                    Activation Pending
                </h1>
                <p className="text-[#6A6A6A] mb-8">
                    Your account has the <strong>Super Admin</strong> role, but your session needs to be updated.
                    <br /><br />
                    Please <strong>Sign Out</strong> and log back in to access the dashboard.
                </p>
                <div className="flex justify-center">
                    <a href="/sign-in" className="px-6 py-3 bg-[#1F1F1F] text-white font-mono text-xs uppercase tracking-widest hover:bg-[#333] rounded">
                        Return to Sign In
                    </a>
                </div>
            </Container>
        );
    }

    if (status === 'success') {
        return (
            <Container>
                <div className="flex justify-center mb-6">
                    <div className="w-20 h-20 bg-green-600 flex items-center justify-center rounded-full shadow-lg">
                        <CheckCircle2 className="text-white" size={40} />
                    </div>
                </div>
                <h1 className="text-3xl font-serif font-bold text-[#1F1F1F] mb-4">
                    Owner Account Claimed
                </h1>
                <p className="text-[#6A6A6A] mb-8">
                    You have been successfully registered as the <strong>Super Admin</strong>.
                    <br />
                    Important: You must <strong>Sign Out</strong> and log in again to activate your privileges.
                </p>
                <a href="/sign-in" className="px-6 py-3 bg-[#1F1F1F] text-white font-mono text-xs uppercase tracking-widest hover:bg-[#333] rounded">
                    Go to Sign In
                </a>
            </Container>
        );
    }

    if (status === 'lockdown') {
        return (
            <Container>
                <div className="flex justify-center mb-6">
                    <div className="w-20 h-20 bg-[#8D0B41] flex items-center justify-center rounded-full shadow-lg">
                        <ShieldCheck className="text-white" size={40} />
                    </div>
                </div>
                <h1 className="text-3xl font-serif font-bold text-[#8D0B41] mb-4">
                    Setup Locked
                </h1>
                <p className="text-[#6A6A6A] mb-8">
                    The Super Admin account has already been claimed.
                    Public signup is strictly disabled.
                </p>
                <a href="/access-denied" className="px-6 py-3 bg-gray-200 text-[#1F1F1F] font-mono text-xs uppercase tracking-widest hover:bg-gray-300 rounded">
                    Back
                </a>
            </Container>
        );
    }

    if (status === 'error') {
        return (
            <Container>
                <div className="flex justify-center mb-6">
                    <div className="w-20 h-20 bg-red-600 flex items-center justify-center rounded-full shadow-lg">
                        <AlertTriangle className="text-white" size={40} />
                    </div>
                </div>
                <h1 className="text-3xl font-serif font-bold text-red-600 mb-4">
                    Setup Failed
                </h1>
                <p className="text-[#6A6A6A] mb-6">
                    We encountered an error while setting up your account.
                </p>
                <div className="bg-red-50 p-4 rounded text-left mb-6 overflow-auto max-h-40">
                    <p className="font-mono text-xs text-red-800 break-all">
                        {errorMessage}
                    </p>
                </div>
                <p className="text-xs text-gray-500 mb-6">
                    Check your Clerk Secret Key and API Keys in your environment variables.
                </p>
                <a href="/setup" className="px-6 py-3 bg-[#1F1F1F] text-white font-mono text-xs uppercase tracking-widest hover:bg-[#333] rounded">
                    Retry
                </a>
            </Container>
        );
    }

    return (
        <div className="min-h-screen bg-[#FFFFF0] flex flex-col items-center justify-center p-4">
            <div className="flex flex-col items-center animate-pulse">
                <Loader2 className="w-10 h-10 text-[#8D0B41] animate-spin mb-4" />
                <p className="font-mono text-xs uppercase tracking-widest text-[#1F1F1F]">
                    Initializing System...
                </p>
            </div>
        </div>
    );
}
