import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2, UserCheck, UserPlus, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Sidebar from "@/components/Sidebar";

const Friends = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState("received");
    const [requests, setRequests] = useState<any[]>([]);
    const [friends, setFriends] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) {
            fetchData();
        }
    }, [user, activeTab]);

    const fetchData = async () => {
        setLoading(true);
        try {
            if (activeTab === "received") {
                const { data, error } = await (supabase as any)
                    .from('friend_requests')
                    .select(`
                        *,
                        sender:sender_id (
                            id,
                            full_name,
                            avatar_url
                        )
                    `)
                    .eq('receiver_id', user?.id)
                    .eq('status', 'pending');
                if (error) throw error;
                setRequests(data || []);
            } else if (activeTab === "sent") {
                const { data, error } = await (supabase as any)
                    .from('friend_requests')
                    .select(`
                        *,
                        receiver:receiver_id (
                            id,
                            full_name,
                            avatar_url
                        )
                    `)
                    .eq('sender_id', user?.id)
                    .eq('status', 'pending');
                if (error) throw error;
                setRequests(data || []);
            } else if (activeTab === "friends") {
                // Fetch friends from 'follows' table (bidirectional follow = friend)
                // Or simpler: fetch accepted requests where user is sender OR receiver
                const { data, error } = await (supabase as any)
                    .from('friend_requests')
                    .select(`
                        *,
                        sender:sender_id (id, full_name, avatar_url),
                        receiver:receiver_id (id, full_name, avatar_url)
                    `)
                    .or(`sender_id.eq.${user?.id},receiver_id.eq.${user?.id}`)
                    .eq('status', 'accepted');

                if (error) throw error;

                // Process data to get the "other" user
                const friendsList = data?.map((req: any) => {
                    return req.sender_id === user?.id ? req.receiver : req.sender;
                }) || [];
                setFriends(friendsList);
            }
        } catch (error) {
            console.error("Error fetching data:", error);
            toast.error("Failed to load data");
        } finally {
            setLoading(false);
        }
    };

    const handleAccept = async (requestId: string, senderId: string) => {
        try {
            // 1. Update request status
            const { error: updateError } = await (supabase as any)
                .from('friend_requests')
                .update({ status: 'accepted' })
                .eq('id', requestId);
            if (updateError) throw updateError;

            // 2. Create bidirectional follows
            await (supabase as any).from('follows').insert([
                { follower_id: user?.id, following_id: senderId },
                { follower_id: senderId, following_id: user?.id }
            ]);

            toast.success("Friend request accepted!");
            fetchData();
        } catch (error) {
            console.error("Error accepting request:", error);
            toast.error("Failed to accept request");
        }
    };

    const handleReject = async (requestId: string) => {
        try {
            const { error } = await (supabase as any)
                .from('friend_requests')
                .update({ status: 'rejected' })
                .eq('id', requestId);
            if (error) throw error;
            toast.success("Friend request rejected");
            fetchData();
        } catch (error) {
            console.error("Error rejecting request:", error);
            toast.error("Failed to reject request");
        }
    };

    return (
        <div className="min-h-screen bg-background flex">
            <Sidebar />
            <div className="flex-1 flex flex-col min-w-0 p-8">
                <h1 className="text-3xl font-bold mb-8">Friends</h1>

                <Tabs defaultValue="received" value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-3 max-w-md mb-8">
                        <TabsTrigger value="received">Received</TabsTrigger>
                        <TabsTrigger value="sent">Sent</TabsTrigger>
                        <TabsTrigger value="friends">My Friends</TabsTrigger>
                    </TabsList>

                    <TabsContent value="received" className="space-y-4">
                        {loading ? (
                            <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
                        ) : requests.length === 0 ? (
                            <div className="text-center text-muted-foreground py-8">No pending requests</div>
                        ) : (
                            requests.map(req => (
                                <Card key={req.id} className="border-border/40">
                                    <CardContent className="p-4 flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <Avatar className="w-12 h-12">
                                                <AvatarImage src={req.sender?.avatar_url} />
                                                <AvatarFallback>{req.sender?.full_name?.charAt(0)}</AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <p className="font-semibold">{req.sender?.full_name}</p>
                                                <p className="text-sm text-muted-foreground">Sent you a friend request</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button size="sm" onClick={() => handleAccept(req.id, req.sender_id)}>
                                                <UserCheck className="w-4 h-4 mr-2" />
                                                Accept
                                            </Button>
                                            <Button size="sm" variant="outline" onClick={() => handleReject(req.id)}>
                                                <X className="w-4 h-4 mr-2" />
                                                Reject
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))
                        )}
                    </TabsContent>

                    <TabsContent value="sent" className="space-y-4">
                        {loading ? (
                            <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
                        ) : requests.length === 0 ? (
                            <div className="text-center text-muted-foreground py-8">No sent requests</div>
                        ) : (
                            requests.map(req => (
                                <Card key={req.id} className="border-border/40">
                                    <CardContent className="p-4 flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <Avatar className="w-12 h-12">
                                                <AvatarImage src={req.receiver?.avatar_url} />
                                                <AvatarFallback>{req.receiver?.full_name?.charAt(0)}</AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <p className="font-semibold">{req.receiver?.full_name}</p>
                                                <p className="text-sm text-muted-foreground">Request pending</p>
                                            </div>
                                        </div>
                                        <Button size="sm" variant="secondary" disabled>
                                            Pending
                                        </Button>
                                    </CardContent>
                                </Card>
                            ))
                        )}
                    </TabsContent>

                    <TabsContent value="friends" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {loading ? (
                            <div className="col-span-full flex justify-center">
                                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                            </div>
                        ) : friends.length === 0 ? (
                            <div className="col-span-full text-center text-muted-foreground py-8">No friends yet</div>
                        ) : (
                            friends.map(friend => (
                                <Card key={friend.id} className="border-border/40 hover:border-primary/50 transition-colors cursor-pointer" onClick={() => navigate(`/profile/${friend.id}`)}>
                                    <CardContent className="p-4 flex items-center gap-4">
                                        <Avatar className="w-12 h-12">
                                            <AvatarImage src={friend.avatar_url} />
                                            <AvatarFallback>{friend.full_name?.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <p className="font-semibold">{friend.full_name}</p>
                                            <Button variant="link" className="p-0 h-auto text-xs" onClick={(e) => {
                                                e.stopPropagation();
                                                navigate(`/messages?userId=${friend.id}`);
                                            }}>
                                                Send Message
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))
                        )}
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
};

export default Friends;
