"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import BadgeGallery from "@/components/badges/BadgeGallery";
import SkillsInterests from "@/components/profile/SkillsInterests";
import ProfileActivity from "@/components/profile/ProfileActivity";
import { useVelocityPoints } from "@/hooks/useVelocityPoints";
import { useProfile } from "@/hooks/useProfile";
import { formatVPFull } from "@/utils/vpCalculations";
import { User, Mail, School, Calendar, Phone, LogOut, Heart, MessageCircle, Trash2, Trophy, Zap, Award } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useRouter } from "next/navigation";
import StreakStatsCard from "@/components/profile/StreakStatsCard";
import QuickStats from "@/components/profile/QuickStats";

const Profile = () => {
    const { user, loading: authLoading, signOut } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!authLoading && !user) {
            router.push("/auth");
        }
    }, [user, authLoading, router]);

    const { totalVp, currentLevel, loading: loadingVP } = useVelocityPoints();
    const {
        profile,
        posts,
        rank,
        loading: loadingProfile,
        loadingPosts,
        loadingRank,
        updateProfile: updateProfileData,
        deletePost: deletePostData,
    } = useProfile(user?.id);

    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(false);

    // Form state
    const [fullName, setFullName] = useState("");
    const [college, setCollege] = useState("");
    const [hscYear, setHscYear] = useState("");
    const [phone, setPhone] = useState("");
    const [avatarUrl, setAvatarUrl] = useState("");

    // Initialize form with profile data when it loads
    useEffect(() => {
        if (profile) {
            setFullName(profile.full_name || user?.user_metadata?.full_name || "");
            setAvatarUrl(profile.avatar_url || user?.user_metadata?.avatar_url || "");
        }
        // Initialize from user metadata
        if (user) {
            setCollege(user.user_metadata?.college || "");
            setHscYear(user.user_metadata?.hsc_year || "");
            setPhone(user.user_metadata?.phone || "");
        }
    }, [profile, user]);

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const { error } = await updateProfileData({
            full_name: fullName,
            college,
            hsc_year: hscYear,
            phone,
            avatar_url: avatarUrl,
        });

        if (!error) {
            setIsEditing(false);
        }
        setLoading(false);
    };

    const handleDeletePost = async (postId: string) => {
        if (!confirm("Are you sure you want to delete this post?")) return;
        await deletePostData(postId);
    };

    const handleSignOut = async () => {
        await signOut();
        router.push("/auth");
    };

    return (
        <div className="container mx-auto px-6 py-8">
            <h1 className="text-3xl font-bold mb-8">Student Profile</h1>

            <div className="max-w-4xl mx-auto w-full space-y-8">
                {/* Profile Info Card */}
                <Card className="border-border/40">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>Personal Information</CardTitle>
                        <div className="flex gap-2">
                            <Button
                                variant="destructive"
                                size="sm"
                                onClick={handleSignOut}
                            >
                                <LogOut className="w-4 h-4 mr-2" />
                                Sign Out
                            </Button>
                            <Button
                                variant={isEditing ? "ghost" : "outline"}
                                size="sm"
                                onClick={() => setIsEditing(!isEditing)}
                            >
                                {isEditing ? "Cancel" : "Edit Profile"}
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleUpdateProfile} className="space-y-6">
                            {/* Avatar Section */}
                            <div className="flex flex-col items-center gap-4 mb-6">
                                <Avatar className="w-24 h-24 border-4 border-accent/20">
                                    <AvatarImage src={avatarUrl} />
                                    <AvatarFallback className="text-2xl">
                                        {fullName?.charAt(0) || "S"}
                                    </AvatarFallback>
                                </Avatar>
                                {isEditing && (
                                    <div className="w-full max-w-xs">
                                        <Label htmlFor="avatar" className="text-xs text-muted-foreground mb-1 block">Profile Picture URL</Label>
                                        <div className="flex gap-2">
                                            <Input
                                                id="avatar"
                                                value={avatarUrl}
                                                onChange={(e) => setAvatarUrl(e.target.value)}
                                                placeholder="https://example.com/avatar.jpg"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="name" className="flex items-center gap-2">
                                        <User className="w-4 h-4 text-muted-foreground" />
                                        Full Name
                                    </Label>
                                    <Input
                                        id="name"
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                        disabled={!isEditing}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="email" className="flex items-center gap-2">
                                        <Mail className="w-4 h-4 text-muted-foreground" />
                                        Email
                                    </Label>
                                    <Input
                                        id="email"
                                        value={user?.email || ""}
                                        disabled
                                        className="bg-muted/50"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="college" className="flex items-center gap-2">
                                        <School className="w-4 h-4 text-muted-foreground" />
                                        College Name
                                    </Label>
                                    <Input
                                        id="college"
                                        value={college}
                                        onChange={(e) => setCollege(e.target.value)}
                                        disabled={!isEditing}
                                        placeholder="e.g. Dhaka College"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="hsc" className="flex items-center gap-2">
                                        <Calendar className="w-4 h-4 text-muted-foreground" />
                                        HSC Year
                                    </Label>
                                    <Input
                                        id="hsc"
                                        value={hscYear}
                                        onChange={(e) => setHscYear(e.target.value)}
                                        disabled={!isEditing}
                                        placeholder="e.g. 2024"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="phone" className="flex items-center gap-2">
                                        <Phone className="w-4 h-4 text-muted-foreground" />
                                        Phone Number
                                    </Label>
                                    <Input
                                        id="phone"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        disabled={!isEditing}
                                        placeholder="e.g. 017..."
                                    />
                                </div>
                            </div>

                            {isEditing && (
                                <div className="flex justify-end pt-4">
                                    <Button type="submit" className="gradient-primary" disabled={loading}>
                                        {loading ? "Saving..." : "Save Changes"}
                                    </Button>
                                </div>
                            )}
                        </form>
                    </CardContent>
                </Card>

                {/* VP Stats and Content Grid */}
                {!loadingVP && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Left Column - Main Content */}
                        <div className="lg:col-span-2 space-y-6">
                            <Card className="border-border/40">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Trophy className="w-5 h-5 text-accent" />
                                        Your Progress
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                                        <div>
                                            <p className="text-sm text-muted-foreground mb-1">Current Level</p>
                                            <p className="text-2xl font-bold gradient-text">{currentLevel.name}</p>
                                            <p className="text-xs text-muted-foreground mt-1">{currentLevel.description}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
                                                <Zap className="w-4 h-4" />
                                                Total Velocity Points
                                            </p>
                                            <p className="text-2xl font-bold gradient-text">{formatVPFull(totalVp)}</p>
                                            <p className="text-xs text-muted-foreground mt-1">Keep sprinting!</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
                                                <Trophy className="w-4 h-4" />
                                                Global Rank
                                            </p>
                                            {loadingRank ? (
                                                <p className="text-2xl font-bold gradient-text">...</p>
                                            ) : rank ? (
                                                <>
                                                    <p className="text-2xl font-bold gradient-text">#{rank.global_rank}</p>
                                                    <p className="text-xs text-muted-foreground mt-1">
                                                        Top {rank.total_users > 0 ? ((rank.global_rank / rank.total_users) * 100).toFixed(1) : '0'}%
                                                    </p>
                                                </>
                                            ) : (
                                                <p className="text-2xl font-bold gradient-text">--</p>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <SkillsInterests isEditing={isEditing} />
                            <QuickStats />
                        </div>

                        {/* Right Column - Sidebar */}
                        <div className="lg:col-span-1 space-y-6">
                            <StreakStatsCard />
                            <ProfileActivity />
                        </div>
                    </div>
                )}

                {/* Badge Gallery */}
                {!loadingVP && (
                    <BadgeGallery currentLevelId={currentLevel.id} />
                )}

                {/* User Posts Section */}
                <div>
                    <h2 className="text-2xl font-bold mb-4">My Posts</h2>
                    <div className="space-y-4">
                        {loadingPosts ? (
                            <div className="text-center py-8 text-muted-foreground">Loading posts...</div>
                        ) : posts.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground bg-card/50 rounded-xl border border-border/40">
                                You haven't posted anything yet.
                            </div>
                        ) : (
                            posts.map((post) => (
                                <Card key={post.id} className="border-border/40">
                                    <CardContent className="pt-6">
                                        <div className="flex justify-between items-start mb-2">
                                            <p className="text-sm text-muted-foreground">
                                                {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                                            </p>
                                            <Button variant="ghost" size="icon" onClick={() => handleDeletePost(post.id)} className="text-destructive hover:text-destructive/90 h-8 w-8">
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
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
    );
};

export default Profile;
