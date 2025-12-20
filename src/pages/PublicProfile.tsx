import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowLeft, Heart, MessageCircle, UserPlus, UserCheck } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import Sidebar from "@/components/Sidebar";
import { toast } from "sonner";

interface ProfileData {
    id: string;
    full_name: string;
    avatar_url: string;
}

interface Post {
    id: string;
    content: string;
    likes_count: number;
    comments_count: number;
    created_at: string;
    user_id: string;
}

const PublicProfile = () => {
    const { userId } = useParams();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [profile, setProfile] = useState<ProfileData | null>(null);
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [friendStatus, setFriendStatus] = useState<'none' | 'pending_sent' | 'pending_received' | 'friends'>('none');
    const [requestId, setRequestId] = useState<string | null>(null);

    useEffect(() => {
        if (userId) {
            fetchProfile();
            fetchPosts();
            checkFriendStatus();
        }
    }, [userId, user]);

    const fetchProfile = async () => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (error) throw error;
            setProfile(data);
        } catch (error) {
            console.error("Error fetching profile:", error);
        }
    };

    const fetchPosts = async () => {
        try {
            const { data, error } = await supabase
                .from('posts')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setPosts(data || []);
        } catch (error) {
            console.error("Error fetching posts:", error);
        } finally {
            setLoading(false);
        }
    };

    const checkFriendStatus = async () => {
        if (!user || !userId) return;

        // Check friend requests
        const { data, error } = await (supabase as any)
            .from('friend_requests')
            .select('*')
            .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
            .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
            .maybeSingle();

        if (data) {
            setRequestId(data.id);
            if (data.status === 'accepted') {
                setFriendStatus('friends');
            } else if (data.status === 'pending') {
                setFriendStatus(data.sender_id === user.id ? 'pending_sent' : 'pending_received');
            } else {
                setFriendStatus('none');
            }
        } else {
            setFriendStatus('none');
            setRequestId(null);
        }
    };

    const handleAddFriend = async () => {
        if (!user || !userId) return;
        try {
            const { error } = await (supabase as any)
                .from('friend_requests')
                .insert({ sender_id: user.id, receiver_id: userId });
            if (error) throw error;
            toast.success("Friend request sent!");
            checkFriendStatus();
        } catch (error) {
            console.error("Error sending friend request:", error);
            toast.error("Failed to send request");
        }
    };

    const handleAcceptRequest = async () => {
        if (!requestId) return;
        try {
            await (supabase as any).from('friend_requests').update({ status: 'accepted' }).eq('id', requestId);
            // Create bidirectional follows
            await (supabase as any).from('follows').insert([
                { follower_id: user?.id, following_id: userId },
                { follower_id: userId, following_id: user?.id }
            ]);
            toast.success("Friend request accepted!");
            checkFriendStatus();
        } catch (error) {
            console.error("Error accepting request:", error);
            toast.error("Failed to accept request");
        }
    };

    const handleCancelRequest = async () => {
        if (!requestId) return;
        try {
            await (supabase as any).from('friend_requests').delete().eq('id', requestId);
            toast.success("Request cancelled");
            checkFriendStatus();
        } catch (error) {
            console.error("Error cancelling request:", error);
            toast.error("Failed to cancel request");
        }
    };

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
    }

    if (!profile) {
        return <div className="min-h-screen flex items-center justify-center">User not found</div>;
    }

    return (
        <div className="min-h-screen bg-background flex">
            <Sidebar />

            <div className="flex-1 flex flex-col min-w-0 p-8 overflow-y-auto h-screen">
                <Button variant="ghost" className="w-fit mb-6" onClick={() => navigate(-1)}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                </Button>

                <div className="max-w-4xl mx-auto w-full space-y-8">
                    {/* Profile Header */}
                    <Card className="border-border/40">
                        <CardContent className="pt-6">
                            <div className="flex flex-col md:flex-row items-center gap-6">
                                <Avatar className="w-32 h-32 border-4 border-accent/20">
                                    <AvatarImage src={profile.avatar_url} />
                                    <AvatarFallback className="text-4xl">
                                        {profile.full_name?.charAt(0) || "U"}
                                    </AvatarFallback>
                                </Avatar>

                                <div className="flex-1 text-center md:text-left space-y-2">
                                    <h1 className="text-3xl font-bold">{profile.full_name}</h1>

                                    <div className="flex items-center justify-center md:justify-start gap-4 pt-2">
                                        {user && user.id !== userId && (
                                            <>
                                                {friendStatus === 'none' && (
                                                    <Button onClick={handleAddFriend} className="gradient-primary">
                                                        <UserPlus className="w-4 h-4 mr-2" />
                                                        Add Friend
                                                    </Button>
                                                )}
                                                {friendStatus === 'pending_sent' && (
                                                    <Button variant="outline" onClick={handleCancelRequest}>
                                                        <UserCheck className="w-4 h-4 mr-2" />
                                                        Request Sent
                                                    </Button>
                                                )}
                                                {friendStatus === 'pending_received' && (
                                                    <Button onClick={handleAcceptRequest} className="gradient-primary">
                                                        <UserCheck className="w-4 h-4 mr-2" />
                                                        Accept Request
                                                    </Button>
                                                )}
                                                {friendStatus === 'friends' && (
                                                    <Button variant="outline" className="border-green-500 text-green-500 hover:text-green-600">
                                                        <UserCheck className="w-4 h-4 mr-2" />
                                                        Friends
                                                    </Button>
                                                )}

                                                <Button variant="outline" onClick={() => navigate(`/messages?userId=${userId}`)}>
                                                    <MessageCircle className="w-4 h-4 mr-2" />
                                                    Message
                                                </Button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Posts Section */}
                    <div>
                        <h2 className="text-2xl font-bold mb-4">Posts</h2>
                        <div className="space-y-4">
                            {posts.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground bg-card/50 rounded-xl border border-border/40">
                                    No posts yet.
                                </div>
                            ) : (
                                posts.map((post) => (
                                    <Card key={post.id} className="border-border/40">
                                        <CardContent className="pt-6">
                                            <div className="flex justify-between items-start mb-2">
                                                <p className="text-sm text-muted-foreground">
                                                    {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                                                </p>
                                            </div>
                                            <p className="text-foreground mb-4 whitespace-pre-wrap">{post.content}</p>
                                            <div className="flex items-center gap-6 text-muted-foreground text-sm">
                                                <span className="flex items-center gap-1">
                                                    <Heart className="w-4 h-4" /> {post.likes_count}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <MessageCircle className="w-4 h-4" /> {post.comments_count}
                                                </span>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PublicProfile;
