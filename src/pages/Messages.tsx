import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Send, Search, MoreVertical, Phone, Video, MessageCircle } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import Sidebar from "@/components/Sidebar";
import { formatDistanceToNow } from "date-fns";

const Messages = () => {
    const { user } = useAuth();

    const [searchParams] = useSearchParams();
    const initialUserId = searchParams.get("userId");

    const [conversations, setConversations] = useState<any[]>([]);
    const [activeConversation, setActiveConversation] = useState<any>(null);
    const [messages, setMessages] = useState<any[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [loading, setLoading] = useState(true);
    const scrollRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        setTimeout(() => {
            if (scrollRef.current) {
                scrollRef.current.scrollIntoView({ behavior: 'smooth' });
            }
        }, 100);
    };

    useEffect(() => {
        if (user) {
            fetchConversations();
        } else {
            setLoading(false); // Stop loading if no user (though ProtectedRoute should prevent this)
        }
    }, [user]);

    useEffect(() => {
        if (!loading && initialUserId) {
            const conv = conversations.find(c => c.other_user?.id === initialUserId);
            if (conv) {
                setActiveConversation(conv);
            } else {
                // If conversation doesn't exist yet, fetch user details and create a temporary one
                fetchUserDetails(initialUserId);
            }
        }
    }, [initialUserId, loading]); // Removed conversations dependency to avoid loops, though strict mode might still trigger. Better to rely on loading state.

    useEffect(() => {
        if (activeConversation) {
            fetchMessages(activeConversation.other_user.id);
            const subscription = (supabase as any)
                .channel(`messages:${activeConversation.other_user.id}`)
                .on('postgres_changes', {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages',
                    filter: `receiver_id=eq.${user?.id}`,
                }, (payload: any) => {
                    if (payload.new.sender_id === activeConversation.other_user.id) {
                        setMessages(prev => [...prev, payload.new]);
                        scrollToBottom();
                    }
                })
                .subscribe();

            return () => {
                subscription.unsubscribe();
            };
        }
    }, [activeConversation]);

    const fetchUserDetails = async (id: string) => {
        const { data } = await (supabase as any).from('profiles').select('*').eq('id', id).single();
        if (data) {
            const newConv = {
                other_user: data,
                last_message: null
            };
            setActiveConversation(newConv);
            setConversations(prev => [newConv, ...prev]);
        }
    };

    const fetchConversations = async () => {
        try {
            // This is a complex query to get unique conversations. 
            // For simplicity, we'll fetch all messages involving the user and process them client-side.
            // In a production app, you'd want a dedicated 'conversations' table or a view.
            const { data, error } = await (supabase as any)
                .from('messages')
                .select(`
                    *,
                    sender:sender_id(id, full_name, avatar_url),
                    receiver:receiver_id(id, full_name, avatar_url)
                `)
                .or(`sender_id.eq.${user?.id},receiver_id.eq.${user?.id}`)
                .order('created_at', { ascending: false });

            if (error) {
                console.error("Error fetching conversations:", error);
                throw error;
            }

            const uniqueUsers = new Map();
            data?.forEach((msg: any) => {
                const otherUser = msg.sender_id === user?.id ? msg.receiver : msg.sender;
                if (otherUser && !uniqueUsers.has(otherUser.id)) {
                    uniqueUsers.set(otherUser.id, {
                        other_user: otherUser,
                        last_message: msg
                    });
                }
            });

            const convs = Array.from(uniqueUsers.values());
            setConversations(convs);
        } catch (error) {
            console.error("Error fetching conversations:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchMessages = async (otherUserId: string) => {
        const { data, error } = await (supabase as any)
            .from('messages')
            .select('*')
            .or(`and(sender_id.eq.${user?.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${user?.id})`)
            .order('created_at', { ascending: true });

        if (error) {
            console.error("Error fetching messages:", error);
        } else {
            setMessages(data || []);
            scrollToBottom();
        }
    };

    const handleSendMessage = async () => {
        if (!newMessage.trim() || !activeConversation) return;

        try {
            const { error } = await (supabase as any).from('messages').insert({
                sender_id: user?.id,
                receiver_id: activeConversation.other_user.id,
                content: newMessage
            });

            if (error) throw error;

            // Optimistic update
            const newMsg = {
                id: Date.now().toString(), // Temp ID
                sender_id: user?.id,
                receiver_id: activeConversation.other_user.id,
                content: newMessage,
                created_at: new Date().toISOString()
            };
            setMessages(prev => [...prev, newMsg]);
            setNewMessage("");
            scrollToBottom();

            // Update conversation list last message
            setConversations(prev => prev.map(c =>
                c.other_user.id === activeConversation.other_user.id
                    ? { ...c, last_message: newMsg }
                    : c
            ));

        } catch (error) {
            console.error("Error sending message:", error);
            toast.error("Failed to send message");
        }
    };



    const safeFormatDate = (dateStr: string) => {
        try {
            if (!dateStr) return "";
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return "";
            return formatDistanceToNow(date, { addSuffix: false });
        } catch (e) {
            console.error("Date formatting error", e);
            return "";
        }
    };

    if (!user) {
        return <div className="flex items-center justify-center h-screen">Please log in to view messages.</div>;
    }

    return (
        <div className="min-h-screen bg-background flex">
            <Sidebar />
            <div className="flex-1 flex min-w-0 h-screen">
                {/* Conversations Sidebar */}
                <div className="w-80 border-r border-border/40 flex flex-col bg-card/30">
                    <div className="p-4 border-b border-border/40">
                        <h2 className="text-xl font-bold mb-4">Messages</h2>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input placeholder="Search messages..." className="pl-9 bg-muted/50 border-0" />
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        <div className="p-2 space-y-2">
                            {conversations.map((conv) => (
                                <div
                                    key={conv.other_user?.id || Math.random()}
                                    className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${activeConversation?.other_user?.id === conv.other_user?.id
                                        ? "bg-primary/10"
                                        : "hover:bg-muted/50"
                                        }`}
                                    onClick={() => conv.other_user && setActiveConversation(conv)}
                                >
                                    <Avatar>
                                        <AvatarImage src={conv.other_user?.avatar_url} />
                                        <AvatarFallback>{conv.other_user?.full_name?.charAt(0) || "?"}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 overflow-hidden">
                                        <div className="flex justify-between items-baseline">
                                            <p className="font-semibold truncate">{conv.other_user?.full_name || "Unknown User"}</p>
                                            {conv.last_message && (
                                                <span className="text-[10px] text-muted-foreground">
                                                    {safeFormatDate(conv.last_message.created_at)}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-muted-foreground truncate">
                                            {conv.last_message?.sender_id === user?.id ? "You: " : ""}
                                            {conv.last_message?.content || "Start a conversation"}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Chat Window */}
                <div className="flex-1 flex flex-col bg-background">
                    {activeConversation && activeConversation.other_user ? (
                        <>
                            {/* Chat Header */}
                            <div className="p-4 border-b border-border/40 flex justify-between items-center bg-card/30">
                                <div className="flex items-center gap-3">
                                    <Avatar>
                                        <AvatarImage src={activeConversation.other_user.avatar_url} />
                                        <AvatarFallback>{activeConversation.other_user.full_name?.charAt(0) || "?"}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <h3 className="font-semibold">{activeConversation.other_user.full_name || "Unknown User"}</h3>
                                        <p className="text-xs text-muted-foreground">Online</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button variant="ghost" size="icon"><Phone className="w-5 h-5" /></Button>
                                    <Button variant="ghost" size="icon"><Video className="w-5 h-5" /></Button>
                                    <Button variant="ghost" size="icon"><MoreVertical className="w-5 h-5" /></Button>
                                </div>
                            </div>

                            {/* Messages Area */}
                            <div className="flex-1 p-4 overflow-y-auto">
                                <div className="space-y-4">
                                    {messages.map((msg, index) => {
                                        const isMe = msg.sender_id === user?.id;
                                        return (
                                            <div key={index} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                                                <div className={`max-w-[70%] rounded-2xl px-4 py-2 ${isMe
                                                    ? "bg-primary text-primary-foreground rounded-tr-none"
                                                    : "bg-muted rounded-tl-none"
                                                    }`}>
                                                    <p className="text-sm">{msg.content}</p>
                                                    <p className={`text-[10px] mt-1 ${isMe ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                                                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    <div ref={scrollRef} />
                                </div>
                            </div>

                            {/* Input Area */}
                            <div className="p-4 border-t border-border/40 bg-card/30">
                                <div className="flex gap-2">
                                    <Input
                                        placeholder="Type a message..."
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                                        className="flex-1"
                                    />
                                    <Button onClick={handleSendMessage} size="icon" className="gradient-primary">
                                        <Send className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex items-center justify-center text-muted-foreground flex-col gap-4">
                            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                                <MessageCircle className="w-8 h-8" />
                            </div>
                            <p>Select a conversation to start messaging</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Messages;
