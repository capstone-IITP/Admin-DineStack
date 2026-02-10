'use server';

import { auth, clerkClient } from "@clerk/nextjs/server";

export async function claimSuperAdmin() {
    const { userId } = await auth();
    if (!userId) {
        return { success: false, message: "Unauthorized" };
    }

    const client = await clerkClient();

    try {
        // 1. Check if already admin (redundant but safe)
        const user = await client.users.getUser(userId);
        const currentRole = (user.privateMetadata as any)?.role;

        if (currentRole === 'super_admin') {
            return { success: true, message: "Already admin" };
        }

        // 2. Strict Check: First user only
        const userList = await client.users.getUserList({ limit: 2 });
        // Logic: specific to "first user is owner".
        if (userList.totalCount === 1) {
            await client.users.updateUserMetadata(userId, {
                privateMetadata: {
                    role: 'super_admin'
                }
            });
            return { success: true, message: "Role assigned" };
        } else {
            return { success: false, message: "Setup is locked. Contact support." };
        }
    } catch (error: any) {
        console.error("Claim error:", error);
        return { success: false, message: error.message };
    }
}
