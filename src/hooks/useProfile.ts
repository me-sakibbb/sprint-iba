import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Post {
    id: string;
    content: string;
    likes_count: number;
    comments_count: number;
    created_at: string;
}

interface ProfileData {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
}

interface UserRank {
    global_rank: number;
    total_users: number;
}

export function useProfile(userId: string | undefined) {
    const [profile, setProfile] = useState<ProfileData | null>(null);
    const [posts, setPosts] = useState<Post[]>([]);
    const [rank, setRank] = useState<UserRank | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadingPosts, setLoadingPosts] = useState(true);
    const [loadingRank, setLoadingRank] = useState(true);

    // Fetch profile data
    useEffect(() => {
        if (!userId) {
            setLoading(false);
            return;
        }

        const fetchProfile = async () => {
            try {
                const { data: profileData, error } = await (supabase as any)
                    .from('profiles')
                    .select('*')
                    .eq('id', userId)
                    .single();

                if (error) throw error;
                setProfile(profileData as ProfileData);
            } catch (error) {
                console.error('Error fetching profile:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, [userId]);

    // Fetch user posts
    useEffect(() => {
        if (!userId) {
            setLoadingPosts(false);
            return;
        }

        const fetchPosts = async () => {
            try {
                const { data, error } = await (supabase as any)
                    .from('posts')
                    .select('*')
                    .eq('user_id', userId)
                    .order('created_at', { ascending: false });

                if (error) throw error;
                setPosts((data as Post[]) || []);
            } catch (error) {
                console.error('Error fetching posts:', error);
            } finally {
                setLoadingPosts(false);
            }
        };

        fetchPosts();
    }, [userId]);

    // Fetch user rank
    useEffect(() => {
        if (!userId) {
            setLoadingRank(false);
            return;
        }

        const fetchRank = async () => {
            try {
                const { data, error } = await (supabase as any).rpc('get_user_rank', {
                    p_user_id: userId,
                }) as { data: Array<{ global_rank: number; total_users: number }> | null; error: any };

                if (error) throw error;

                if (data && Array.isArray(data) && data.length > 0) {
                    setRank({
                        global_rank: data[0].global_rank,
                        total_users: data[0].total_users,
                    });
                }
            } catch (error) {
                console.error('Error fetching rank:', error);
            } finally {
                setLoadingRank(false);
            }
        };

        fetchRank();
    }, [userId]);

    // Update profile
    const updateProfile = async (updates: {
        full_name?: string;
        avatar_url?: string;
        college?: string;
        hsc_year?: string;
        phone?: string;
    }) => {
        if (!userId) {
            toast.error('User not found');
            return { error: new Error('User not found') };
        }

        try {
            // Update auth.users metadata
            const { error: authError } = await supabase.auth.updateUser({
                data: updates,
            });
            if (authError) throw authError;

            // Update public.profiles
            const { error: profileError } = await (supabase as any)
                .from('profiles')
                .update({
                    full_name: updates.full_name,
                    avatar_url: updates.avatar_url,
                })
                .eq('id', userId);

            if (profileError) throw profileError;

            // Update local state
            if (profile) {
                setProfile({
                    ...profile,
                    full_name: updates.full_name || profile.full_name,
                    avatar_url: updates.avatar_url || profile.avatar_url,
                });
            }

            toast.success('Profile updated successfully!');
            return { error: null };
        } catch (error: any) {
            toast.error(error.message || 'Failed to update profile');
            return { error };
        }
    };

    // Delete post
    const deletePost = async (postId: string) => {
        try {
            const { error } = await (supabase as any).from('posts').delete().eq('id', postId);
            if (error) throw error;

            // Update local state
            setPosts((prev) => prev.filter((p) => p.id !== postId));
            toast.success('Post deleted');
            return { error: null };
        } catch (error: any) {
            console.error('Error deleting post:', error);
            toast.error('Failed to delete post');
            return { error };
        }
    };

    return {
        profile,
        posts,
        rank,
        loading,
        loadingPosts,
        loadingRank,
        updateProfile,
        deletePost,
    };
}
