"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminHeader from "@/components/admin/AdminHeader";
import { Loader2 } from "lucide-react";

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkAdminRole = async () => {
            if (!user) {
                if (!authLoading) {
                    router.push("/auth");
                }
                return;
            }

            try {
                const { data, error } = await supabase
                    .from("profiles")
                    .select("role")
                    .eq("id", user.id)
                    .single();

                if (error) throw error;

                // Allow both "admin" and "operator" roles
                if (data?.role === "admin" || data?.role === "operator") {
                    setIsAdmin(true);
                } else {
                    router.push("/dashboard");
                }
            } catch (error) {
                console.error("Error checking admin role:", error);
                router.push("/dashboard");
            } finally {
                setLoading(false);
            }
        };

        if (!authLoading) {
            checkAdminRole();
        }
    }, [user, authLoading, router]);

    if (loading || authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                    <p className="text-slate-500 text-sm">Verifying access...</p>
                </div>
            </div>
        );
    }

    if (!isAdmin) {
        return null;
    }

    return (
        <div className="min-h-screen bg-slate-50 flex">
            <AdminSidebar />
            <div className="flex-1 flex flex-col">
                <AdminHeader />
                <main className="flex-1 p-6">
                    {children}
                </main>
            </div>
        </div>
    );
}
