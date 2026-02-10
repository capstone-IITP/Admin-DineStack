import { auth, clerkClient } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { CheckCircle2, ShieldCheck, Loader2 } from "lucide-react";

export default async function SetupPage() {
    const { userId, sessionClaims } = await auth();

    // 1. If not logged in, go to sign-in
    if (!userId) {
        redirect('/sign-in');
    }

    // 2. Check if already has role
    const currentRole = (sessionClaims?.metadata as any)?.role;
    if (currentRole === 'super_admin') {
        redirect('/');
    }

    // 3. System Check: Is this the first user?
    const client = await clerkClient();
    const userList = await client.users.getUserList({ limit: 2 });

    // If there is exactly 1 user (current user), or if we are just setting up
    // Note: If limit is 2 and we get 1, we are good.
    // If we get 2, we need to check if we are allowed.
    // STRICT RULE: Only allow if total count is 1.

    const isFirstUser = userList.totalCount === 1;

    let status = 'denied';

    if (isFirstUser) {
        try {
            await client.users.updateUserMetadata(userId, {
                publicMetadata: {
                    role: 'super_admin'
                }
            });
            status = 'success';
        } catch (error) {
            console.error("Failed to assign role:", error);
            status = 'error';
        }
    } else {
        // If more than 1 user exists, strict lockdown.
        // But maybe the owner never set "role" metadata? 
        // We assume the prompt "Allow signup temporarily to create the initial owner account" 
        // means the *very first* user is the owner.
        status = 'lockdown';
    }

    if (status === 'success') {
        // Force token refresh by signing out or just redirecting?
        // Redirecting might not update the token immediately. 
        // Ideally user should re-login or we wait. 
        // For now, let's redirect to home, middleware might block if token is stale.
        // We will show a success message asking to refresh/re-login.

        return (
            <div className="min-h-screen bg-[#FFFFF0] flex flex-col items-center justify-center p-4">
                <div className="text-center animate-in fade-in zoom-in duration-500">
                    <div className="flex justify-center mb-6">
                        <div className="w-20 h-20 bg-green-600 flex items-center justify-center rounded-full shadow-lg">
                            <CheckCircle2 className="text-white" size={40} />
                        </div>
                    </div>
                    <h1 className="text-3xl font-serif font-bold text-[#1F1F1F] mb-4">
                        Owner Account Claimed
                    </h1>
                    <p className="text-[#6A6A6A] max-w-md mx-auto mb-8">
                        You have been successfully registered as the <strong>Super Admin</strong>.
                        <br />
                        Please return to the dashboard.
                    </p>
                    <a href="/" className="px-6 py-3 bg-[#1F1F1F] text-white font-mono text-xs uppercase tracking-widest hover:bg-[#333]">
                        Go to Dashboard
                    </a>
                </div>
            </div>
        );
    }

    if (status === 'lockdown') {
        return (
            <div className="min-h-screen bg-[#FFFFF0] flex flex-col items-center justify-center p-4">
                <div className="text-center">
                    <h1 className="text-3xl font-serif font-bold text-[#8D0B41] mb-4">
                        Setup Locked
                    </h1>
                    <p className="text-[#6A6A6A] max-w-md mx-auto mb-8">
                        The Super Admin account has already been claimed.
                        Public signup is strictly disabled.
                    </p>
                    <a href="/access-denied" className="px-6 py-3 bg-gray-200 text-[#1F1F1F] font-mono text-xs uppercase tracking-widest hover:bg-gray-300">
                        Back
                    </a>
                </div>
            </div>
        );
    }

    return (
        <div>Processing...</div>
    );
}
