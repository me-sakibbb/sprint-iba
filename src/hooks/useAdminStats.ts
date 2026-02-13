import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface AdminStats {
    totalUsers: number;
    totalQuestions: number;
    activeToday: number;
    newUsersThisWeek: number;
}

export function useAdminStats() {
    const [stats, setStats] = useState<AdminStats>({
        totalUsers: 0,
        totalQuestions: 0,
        activeToday: 0,
        newUsersThisWeek: 0,
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                // Fetch user count
                const { count: userCount } = await (supabase as any)
                    .from('profiles')
                    .select('*', { count: 'exact', head: true });

                // Fetch question count
                const { count: questionCount } = await supabase
                    .from('questions')
                    .select('*', { count: 'exact', head: true });

                setStats({
                    totalUsers: userCount || 0,
                    totalQuestions: questionCount || 0,
                    // TODO: Implement these metrics
                    activeToday: Math.floor(Math.random() * 50) + 10, // Placeholder
                    newUsersThisWeek: Math.floor(Math.random() * 20) + 5, // Placeholder
                });
            } catch (error) {
                console.error('Error fetching stats:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, []);

    return {
        stats,
        loading,
    };
}
