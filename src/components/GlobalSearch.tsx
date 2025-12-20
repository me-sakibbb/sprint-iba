import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Search, User, MessageSquare, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useDebounce } from "@/hooks/use-debounce"; // We might need to create this hook or implement debounce manually

const GlobalSearch = () => {
    const navigate = useNavigate();
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<{ users: any[], posts: any[] }>({ users: [], posts: [] });
    const [loading, setLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Debounce logic
    const [debouncedQuery, setDebouncedQuery] = useState(query);
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedQuery(query);
        }, 300);
        return () => clearTimeout(handler);
    }, [query]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        if (debouncedQuery.trim().length > 2) {
            performSearch();
        } else {
            setResults({ users: [], posts: [] });
        }
    }, [debouncedQuery]);

    const performSearch = async () => {
        setLoading(true);
        setIsOpen(true);
        try {
            // Search Users
            const { data: users } = await supabase
                .from('profiles')
                .select('id, full_name, avatar_url')
                .ilike('full_name', `%${debouncedQuery}%`)
                .limit(5);

            // Search Posts
            const { data: posts } = await supabase
                .from('posts')
                .select('id, content, created_at, user:user_id(full_name)')
                .ilike('content', `%${debouncedQuery}%`)
                .limit(5);

            setResults({
                users: users || [],
                posts: posts || []
            });
        } catch (error) {
            console.error("Search error:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectUser = (userId: string) => {
        navigate(`/profile/${userId}`);
        setIsOpen(false);
        setQuery("");
    };

    const handleSelectPost = (postId: string) => {
        // Navigate to post details (if we had a post details page) or just community for now
        // Ideally: navigate(`/post/${postId}`)
        navigate(`/community`);
        setIsOpen(false);
        setQuery("");
    };

    return (
        <div className="relative w-full max-w-md" ref={containerRef}>
            <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                    placeholder="Search users or threads..."
                    className="pl-9 bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => {
                        if (results.users.length > 0 || results.posts.length > 0) setIsOpen(true);
                    }}
                />
                {loading && (
                    <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
                )}
            </div>

            {isOpen && (results.users.length > 0 || results.posts.length > 0) && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border/40 rounded-lg shadow-lg z-50 overflow-hidden">
                    <ScrollArea className="max-h-[400px]">
                        {results.users.length > 0 && (
                            <div className="p-2">
                                <h3 className="text-xs font-semibold text-muted-foreground px-2 py-1 mb-1">People</h3>
                                {results.users.map(user => (
                                    <div
                                        key={user.id}
                                        className="flex items-center gap-3 p-2 hover:bg-muted/50 rounded-md cursor-pointer"
                                        onClick={() => handleSelectUser(user.id)}
                                    >
                                        <Avatar className="w-8 h-8">
                                            <AvatarImage src={user.avatar_url} />
                                            <AvatarFallback>{user.full_name?.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <span className="text-sm font-medium">{user.full_name}</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        {results.users.length > 0 && results.posts.length > 0 && <div className="h-px bg-border/40 mx-2" />}

                        {results.posts.length > 0 && (
                            <div className="p-2">
                                <h3 className="text-xs font-semibold text-muted-foreground px-2 py-1 mb-1">Threads</h3>
                                {results.posts.map(post => (
                                    <div
                                        key={post.id}
                                        className="flex items-start gap-3 p-2 hover:bg-muted/50 rounded-md cursor-pointer"
                                        onClick={() => handleSelectPost(post.id)}
                                    >
                                        <MessageSquare className="w-4 h-4 mt-1 text-muted-foreground" />
                                        <div className="flex-1 overflow-hidden">
                                            <p className="text-sm truncate">{post.content}</p>
                                            <p className="text-xs text-muted-foreground">by {post.user?.full_name}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </ScrollArea>
                </div>
            )}
        </div>
    );
};

export default GlobalSearch;
