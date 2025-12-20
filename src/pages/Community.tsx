import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Zap, Home, Heart, MessageCircle, Share2, TrendingUp, Users, LogOut, Loader2, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import GlobalSearch from "@/components/GlobalSearch";

interface Post {
  id: string;
  content: string;
  image_url?: string;
  likes_count: number;
  comments_count: number;
  created_at: string;
  user_id: string;
  profiles: {
    full_name: string;
    avatar_url: string;
  };
  user_has_liked?: boolean;
}

const Community = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [newPost, setNewPost] = useState("");
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    fetchPosts();
  }, [user]);

  const fetchPosts = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('posts')
        .select(`
                    *,
                    profiles:user_id (
                        full_name,
                        avatar_url
                    )
                `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Check if user has liked each post
      if (user && data) {
        const postsWithLikes = await Promise.all(data.map(async (post: any) => {
          const { count } = await (supabase as any)
            .from('likes')
            .select('*', { count: 'exact', head: true })
            .eq('post_id', post.id)
            .eq('user_id', user.id);
          return { ...post, user_has_liked: count ? count > 0 : false };
        }));
        setPosts(postsWithLikes as any);
      } else {
        setPosts(data as any);
      }

    } catch (error) {
      console.error("Error fetching posts:", error);
      toast.error("Failed to load posts");
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
  };

  const handleCreatePost = async () => {
    if (!newPost.trim()) {
      toast.error("Please write something to post");
      return;
    }
    if (!user) return;

    setPosting(true);
    try {
      const { error } = await (supabase as any)
        .from('posts')
        .insert({
          user_id: user.id,
          content: newPost
        });

      if (error) throw error;

      toast.success("Post created successfully!");
      setNewPost("");
      fetchPosts(); // Refresh posts
    } catch (error) {
      console.error("Error creating post:", error);
      toast.error("Failed to create post");
    } finally {
      setPosting(false);
    }
  };

  const handleLike = async (postId: string, currentLiked: boolean) => {
    if (!user) return;

    // Optimistic update
    setPosts(prev => prev.map(p => {
      if (p.id === postId) {
        return {
          ...p,
          likes_count: currentLiked ? p.likes_count - 1 : p.likes_count + 1,
          user_has_liked: !currentLiked
        };
      }
      return p;
    }));

    try {
      if (currentLiked) {
        await (supabase as any).from('likes').delete().eq('post_id', postId).eq('user_id', user.id);
        // await supabase.rpc('decrement_likes', { row_id: postId }); 
        await (supabase as any).from('posts').update({ likes_count: posts.find(p => p.id === postId)!.likes_count - 1 }).eq('id', postId);
      } else {
        await (supabase as any).from('likes').insert({ post_id: postId, user_id: user.id });
        await (supabase as any).from('posts').update({ likes_count: posts.find(p => p.id === postId)!.likes_count + 1 }).eq('id', postId);
      }
    } catch (error) {
      console.error("Error toggling like:", error);
      // Revert optimistic update on error
      fetchPosts();
    }
  };

  const [activeComments, setActiveComments] = useState<string | null>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [newComment, setNewComment] = useState("");

  const toggleComments = async (postId: string) => {
    if (activeComments === postId) {
      setActiveComments(null);
      return;
    }
    setActiveComments(postId);
    setLoadingComments(true);
    try {
      const { data, error } = await (supabase as any)
        .from('comments')
        .select(`
                    *,
                    profiles:user_id (
                        full_name,
                        avatar_url
                    )
                `)
        .eq('post_id', postId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setComments(data || []);
    } catch (error) {
      console.error("Error fetching comments:", error);
      toast.error("Failed to load comments");
    } finally {
      setLoadingComments(false);
    }
  };

  const handleAddComment = async (postId: string) => {
    if (!newComment.trim()) return;
    if (!user) return;

    try {
      const { error } = await (supabase as any)
        .from('comments')
        .insert({
          post_id: postId,
          user_id: user.id,
          content: newComment
        });

      if (error) throw error;

      setNewComment("");
      // Refresh comments
      const { data } = await (supabase as any)
        .from('comments')
        .select(`
                    *,
                    profiles:user_id (
                        full_name,
                        avatar_url
                    )
                `)
        .eq('post_id', postId)
        .order('created_at', { ascending: true });
      setComments(data || []);

      // Update post comment count optimistically
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, comments_count: p.comments_count + 1 } : p));
      // Also update in DB
      await (supabase as any).from('posts').update({ comments_count: posts.find(p => p.id === postId)!.comments_count + 1 }).eq('id', postId);

    } catch (error) {
      console.error("Error adding comment:", error);
      toast.error("Failed to add comment");
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!confirm("Are you sure you want to delete this post?")) return;
    try {
      const { error } = await (supabase as any).from('posts').delete().eq('id', postId);
      if (error) throw error;
      toast.success("Post deleted");
      setPosts(prev => prev.filter(p => p.id !== postId));
    } catch (error) {
      console.error("Error deleting post:", error);
      toast.error("Failed to delete post");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <nav className="border-b border-border/40 bg-background/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl gradient-accent flex items-center justify-center">
                <Zap className="w-6 h-6 text-primary-foreground" />
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Sprint IBA
              </span>
            </div>

            <div className="hidden md:block flex-1 max-w-md mx-4">
              <GlobalSearch />
            </div>

            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={() => navigate('/dashboard')}>
                <Home className="w-4 h-4 mr-2" />
                Dashboard
              </Button>
              <Button variant="ghost" onClick={handleSignOut}>
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content - 3 Column Layout */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">

          {/* Left Sidebar - Navigation & Groups (25%) */}
          <div className="hidden md:block md:col-span-3 space-y-6">
            {/* Navigation Menu */}
            <div className="space-y-1">
              <Button variant="secondary" className="w-full justify-start gap-3 bg-muted/50">
                <MessageCircle className="w-5 h-5" />
                Threads
              </Button>
              <Button variant="ghost" className="w-full justify-start gap-3" onClick={() => navigate('/messages')}>
                <div className="relative">
                  <MessageCircle className="w-5 h-5" />
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-primary rounded-full border-2 border-background"></span>
                </div>
                Messaging
                <Badge variant="secondary" className="ml-auto text-xs bg-primary/10 text-primary">1</Badge>
              </Button>
              <Button variant="ghost" className="w-full justify-start gap-3" onClick={() => navigate('/friends')}>
                <Users className="w-5 h-5" />
                Friend Requests
              </Button>
              <Button variant="ghost" className="w-full justify-start gap-3" onClick={() => navigate('/groups')}>
                <Users className="w-5 h-5" />
                Groups
              </Button>
            </div>

            {/* Recommended Groups */}
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-3 px-2">Recommended groups</h3>
              <div className="space-y-3">
                {[
                  { name: "IBA Trans English", members: "2 groups ago", initial: "RT", color: "bg-green-500" },
                  { name: "IBA Exam English", members: "3 groups ago", initial: "IE", color: "bg-red-800" },
                ].map((group, i) => (
                  <div key={i} className="flex items-center gap-3 px-2 py-1 cursor-pointer hover:bg-muted/50 rounded-lg transition-colors">
                    <Avatar className="w-8 h-8 rounded-lg">
                      <AvatarFallback className={`${group.color} text-white text-xs`}>{group.initial}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 overflow-hidden">
                      <p className="text-sm font-medium truncate">{group.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{group.members}</p>
                    </div>
                  </div>
                ))}
              </div>
              <Button className="w-full mt-4" variant="default" onClick={() => navigate('/groups')}>
                Create Group
              </Button>
            </div>
          </div>

          {/* Center Column - Feed (50%) */}
          <div className="md:col-span-6 space-y-6">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-2xl font-bold">Threads</h1>
            </div>

            {/* Create Post (Mobile Only) */}
            <div className="md:hidden mb-6">
              <Card className="border-border/40">
                <CardContent className="p-4 space-y-4">
                  <Textarea
                    placeholder="What's on your mind?"
                    value={newPost}
                    onChange={(e) => setNewPost(e.target.value)}
                    className="min-h-[80px] bg-muted/30 border-0 focus-visible:ring-1"
                  />
                  <div className="flex justify-end">
                    <Button onClick={handleCreatePost} className="gradient-primary" disabled={posting} size="sm">
                      {posting && <Loader2 className="w-3 h-3 mr-2 animate-spin" />}
                      Post
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Posts Feed */}
            <div className="space-y-4">
              {loading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : posts.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground bg-card rounded-xl border border-border/40">
                  No posts yet. Be the first to share!
                </div>
              ) : (
                posts.map((post, index) => (
                  <Card
                    key={post.id}
                    className="border-border/40 hover:border-border/80 transition-all duration-300 animate-fade-in-up"
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar className="w-10 h-10 cursor-pointer" onClick={() => navigate(`/profile/${post.user_id}`)}>
                            <AvatarImage src={post.profiles?.avatar_url} />
                            <AvatarFallback className="gradient-accent text-primary-foreground font-bold text-sm">
                              {post.profiles?.full_name?.charAt(0) || "U"}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-sm cursor-pointer hover:underline" onClick={() => navigate(`/profile/${post.user_id}`)}>
                                {post.profiles?.full_name || "Unknown User"}
                              </p>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                            </p>
                          </div>
                        </div>
                        {user?.id === post.user_id && (
                          <Button variant="ghost" size="icon" onClick={() => handleDeletePost(post.id)} className="text-muted-foreground hover:text-destructive h-8 w-8">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3 pb-3">
                      <h3 className="font-semibold text-lg leading-tight">{post.content.split('\n')[0].substring(0, 60)}{post.content.length > 60 ? "..." : ""}</h3>
                      <p className="text-muted-foreground text-sm leading-relaxed whitespace-pre-wrap line-clamp-3">{post.content}</p>

                      {/* Interaction Buttons */}
                      <div className="flex items-center justify-between pt-2">
                        <div className="flex items-center gap-4">
                          {/* Avatars of likers (Mock) */}
                          <div className="flex -space-x-2">
                            <div className="w-6 h-6 rounded-full bg-blue-500 border-2 border-background flex items-center justify-center text-[10px] text-white">A</div>
                            <div className="w-6 h-6 rounded-full bg-green-500 border-2 border-background flex items-center justify-center text-[10px] text-white">B</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-muted-foreground">
                          <Button
                            variant="ghost"
                            size="sm"
                            className={`gap-1.5 h-8 px-2 text-xs ${post.user_has_liked ? "text-red-500" : ""}`}
                            onClick={() => handleLike(post.id, post.user_has_liked || false)}
                          >
                            <Heart className={`w-4 h-4 ${post.user_has_liked ? "fill-current" : ""}`} />
                            {post.likes_count} Likes
                          </Button>
                          <Button variant="ghost" size="sm" className="gap-1.5 h-8 px-2 text-xs" onClick={() => toggleComments(post.id)}>
                            <MessageCircle className="w-4 h-4" />
                            {post.comments_count} Comments
                          </Button>
                        </div>
                      </div>

                      {/* Comments Section */}
                      {activeComments === post.id && (
                        <div className="pt-4 space-y-4 animate-fade-in border-t border-border/40 mt-2">
                          <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                            {loadingComments ? (
                              <div className="text-center text-xs text-muted-foreground">Loading...</div>
                            ) : comments.length === 0 ? (
                              <div className="text-center text-xs text-muted-foreground">No comments yet.</div>
                            ) : (
                              comments.map(comment => (
                                <div key={comment.id} className="flex gap-3 text-sm">
                                  <Avatar className="w-6 h-6 cursor-pointer mt-1" onClick={() => navigate(`/profile/${comment.user_id}`)}>
                                    <AvatarImage src={comment.profiles?.avatar_url} />
                                    <AvatarFallback className="text-[10px]">{comment.profiles?.full_name?.charAt(0)}</AvatarFallback>
                                  </Avatar>
                                  <div className="bg-muted/50 p-2 rounded-lg flex-1">
                                    <div className="flex justify-between items-start">
                                      <span className="font-semibold text-xs cursor-pointer hover:underline" onClick={() => navigate(`/profile/${comment.user_id}`)}>
                                        {comment.profiles?.full_name}
                                      </span>
                                      <span className="text-[10px] text-muted-foreground">
                                        {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                                      </span>
                                    </div>
                                    <p className="mt-0.5 text-xs">{comment.content}</p>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Input
                              placeholder="Write a comment..."
                              value={newComment}
                              onChange={(e) => setNewComment(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                  e.preventDefault();
                                  handleAddComment(post.id);
                                }
                              }}
                              className="h-8 text-sm"
                            />
                            <Button size="icon" className="h-8 w-8" onClick={() => handleAddComment(post.id)} disabled={!newComment.trim()}>
                              <MessageCircle className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>

            {/* Load More */}
            {!loading && posts.length > 0 && (
              <div className="flex justify-center mt-8">
                <Button variant="outline" className="border-border/40 text-xs h-8">
                  Load More
                </Button>
              </div>
            )}
          </div>

          {/* Right Sidebar - Create Post & Widgets (25%) */}
          <div className="hidden md:block md:col-span-3 space-y-6">
            {/* Create Post Widget */}
            <Card className="border-border/40 shadow-sm">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-base">Share Your Progress</CardTitle>
                <CardDescription className="text-xs">Post your achievements, tips, or questions</CardDescription>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-3">
                <Textarea
                  placeholder="What's on your mind?"
                  value={newPost}
                  onChange={(e) => setNewPost(e.target.value)}
                  className="min-h-[100px] bg-muted/30 border-0 focus-visible:ring-1 resize-none text-sm"
                />
                <Button onClick={handleCreatePost} className="w-full gradient-primary" disabled={posting} size="sm">
                  {posting && <Loader2 className="w-3 h-3 mr-2 animate-spin" />}
                  Post to Community
                </Button>
              </CardContent>
            </Card>

            {/* Recent Threads Widget */}
            <Card className="border-border/40 shadow-sm">
              <div className="flex border-b border-border/40">
                <button className="flex-1 py-3 text-sm font-medium border-b-2 border-primary text-primary">Recent Threads</button>
                <button className="flex-1 py-3 text-sm font-medium text-muted-foreground hover:text-foreground">Popular</button>
                <button className="flex-1 py-3 text-sm font-medium text-muted-foreground hover:text-foreground">Following</button>
              </div>
              <CardContent className="p-0">
                <div className="divide-y divide-border/40">
                  {posts.slice(0, 3).map((post) => (
                    <div key={`recent-${post.id}`} className="p-3 hover:bg-muted/30 cursor-pointer transition-colors" onClick={() => { }}>
                      <div className="flex items-center gap-2 mb-1">
                        <Avatar className="w-5 h-5">
                          <AvatarImage src={post.profiles?.avatar_url} />
                          <AvatarFallback className="text-[8px]">{post.profiles?.full_name?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <span className="text-xs font-medium truncate max-w-[120px]">{post.profiles?.full_name}</span>
                        <span className="text-[10px] text-muted-foreground ml-auto">{formatDistanceToNow(new Date(post.created_at))} ago</span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">{post.content}</p>
                      <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
                        <span>{post.comments_count} comments</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Community;
