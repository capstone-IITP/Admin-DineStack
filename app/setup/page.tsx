import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import SetupProcess from "./setup-process";

export default async function SetupPage() {
    const { userId } = await auth();

    // 1. Server-side redirect if not logged in
    // This happens BEFORE any blank screen can render
    if (!userId) {
        redirect('/sign-in');
    }

    // 2. Render the loading UI immediately while client logic runs
    return (
        <div className="min-h-screen bg-[#FFFFF0] flex flex-col items-center justify-center p-4">
            {/* This content is rendered on the server and sent as HTML */}
            <SetupProcess />
        </div>
    );
}
