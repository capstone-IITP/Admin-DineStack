import { auth, clerkClient } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { CheckCircle2, ShieldCheck } from "lucide-react";
import { SignIn } from "@clerk/nextjs";

export default async function SetupPage() {
    const { userId, sessionClaims } = await auth();

    // 1. If not logged in, go to sign-in
    if (!userId) {
        redirect('/sign-in');
    }

    // 2. Check if already has role (Backend Check is most reliable here)
    // We check via Clerk Client to see the REAL state, ignoring potentially stale session token
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const existingRole = (user.privateMetadata as any)?.role;

    if (existingRole === 'super_admin') {
        // If backend says we are admin, but we are here, it means Middleware sent us here 
        // because the Session Token is stale (doesn't have the role yet).
        // WE MUST ASK USER TO RE-LOGIN.
        return (
            <div className="min-h-screen bg-[#FFFFF0] flex flex-col items-center justify-center p-4">
                <div className="text-center animate-in fade-in zoom-in duration-500">
                    <div className="flex justify-center mb-6">
                        <div className="w-20 h-20 bg-blue-600 flex items-center justify-center rounded-full shadow-lg">
                            <ShieldCheck className="text-white" size={40} />
                        </div>
                    </div>
                    <h1 className="text-3xl font-serif font-bold text-[#1F1F1F] mb-4">
                        Activation Pending
                    </h1>
                    <p className="text-[#6A6A6A] max-w-md mx-auto mb-8">
                        Your account has the <strong>Super Admin</strong> role, but your session needs to be updated.
                        <br /><br />
                        Please <strong>Sign Out</strong> and log back in to access the dashboard.
                    </p>
                    <div className="flex justify-center">
                        <div className="hidden">
                            <SignIn />
                        </div>
                        <a href="/sign-in" className="px-6 py-3 bg-[#1F1F1F] text-white font-mono text-xs uppercase tracking-widest hover:bg-[#333]">
                            Return to Sign In
                        </a>
                    </div>
                </div>
            </div>
        );
    }

    // 3. System Check: Is this the first user?
    const userList = await client.users.getUserList({ limit: 2 });
    const isFirstUser = userList.totalCount === 1;

    let status = 'denied';

    if (isFirstUser) {
        try {
            await client.users.updateUserMetadata(userId, {
                privateMetadata: {
                    role: 'super_admin'
                }
            });
            status = 'success';
        } catch (error) {
            console.error("Failed to assign role:", error);
            status = 'error';
        }
    } else {
        status = 'lockdown';
    }

    if (status === 'success') {
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
                        Important: You must <strong>Sign Out</strong> and log in again to activate your privileges.
                    </p>
                    <a href="/sign-in" className="px-6 py-3 bg-[#1F1F1F] text-white font-mono text-xs uppercase tracking-widest hover:bg-[#333]">
                        Go to Sign In
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
