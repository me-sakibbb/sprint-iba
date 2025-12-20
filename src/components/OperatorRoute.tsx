import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

export const OperatorRoute = ({ children }: { children: React.ReactNode }) => {
    const { user, loading } = useAuth();
    const [isOperator, setIsOperator] = useState<boolean | null>(null);
    const [checkingRole, setCheckingRole] = useState(true);

    useEffect(() => {
        const checkRole = async () => {
            if (!user) {
                setCheckingRole(false);
                return;
            }

            try {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', user.id)
                    .single();

                if (error) {
                    console.error("Error checking role:", error);
                    setIsOperator(false);
                } else {
                    // Check if role is operator
                    // Note: This assumes the 'role' column exists. 
                    // If it doesn't, this might fail or return null.
                    // We treat 'operator' as the required value.
                    setIsOperator(data?.role === 'operator');
                }
            } catch (err) {
                console.error("Exception checking role:", err);
                setIsOperator(false);
            } finally {
                setCheckingRole(false);
            }
        };

        if (!loading) {
            checkRole();
        }
    }, [user, loading]);

    if (loading || checkingRole) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/operator/login" replace />;
    }

    if (!isOperator) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center space-y-4">
                <h1 className="text-2xl font-bold text-red-500">Access Denied</h1>
                <p>You do not have operator privileges.</p>
                <Navigate to="/" replace />
                {/* Or show a button to go back */}
            </div>
        );
    }

    return <>{children}</>;
};
