"use client";

import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Bell, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

export default function AdminHeader() {
    const { user, signOut } = useAuth();
    const router = useRouter();

    const handleSignOut = async () => {
        await signOut();
        router.push("/auth");
    };

    return (
        <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between">
            <div>
                <h2 className="text-sm font-medium text-slate-500">Welcome back,</h2>
                <p className="text-lg font-bold text-slate-900">
                    {user?.user_metadata?.full_name || user?.email || "Admin"}
                </p>
            </div>

            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" className="relative">
                    <Bell className="w-5 h-5 text-slate-500" />
                    <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
                </Button>

                <div className="h-8 w-px bg-slate-200" />

                <div className="flex items-center gap-3">
                    <Avatar className="w-9 h-9">
                        <AvatarImage src={user?.user_metadata?.avatar_url} />
                        <AvatarFallback className="bg-indigo-100 text-indigo-600 font-semibold">
                            {user?.email?.charAt(0).toUpperCase() || "A"}
                        </AvatarFallback>
                    </Avatar>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleSignOut}
                        className="text-slate-400 hover:text-red-500"
                    >
                        <LogOut className="w-4 h-4" />
                    </Button>
                </div>
            </div>
        </header>
    );
}
