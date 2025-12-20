import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Target, Zap, Users, BookOpen, LogOut, MessageSquare, Loader2, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import DailyGoals from "@/components/DailyGoals";
import Notifications from "@/components/Notifications";
import SubjectMastery from "@/components/SubjectMastery";
import Sidebar from "@/components/Sidebar";
import TrackProgress from "@/components/progression/TrackProgress";
import LevelUpAnimation from "@/components/progression/LevelUpAnimation";
import LevelBadge from "@/components/badges/LevelBadge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { User as UserIcon } from "lucide-react";
import { useVelocityPoints } from "@/hooks/useVelocityPoints";
import { formatVPFull } from "@/utils/vpCalculations";

const Dashboard = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const {
    totalVp,
    currentLevel,
    loading: loadingVP,
    showLevelUpAnimation,
    levelUpData,
    closeLevelUpAnimation,
  } = useVelocityPoints();

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
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
              <div className="flex items-center gap-4">
                <Notifications />
                <Button variant="ghost" onClick={() => navigate('/community')}>
                  <Users className="w-4 h-4 mr-2" />
                  Community
                </Button>

                <HoverCard>
                  <HoverCardTrigger asChild>
                    <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                      <Avatar className="h-10 w-10 border-2 border-accent/50 cursor-pointer">
                        <AvatarImage src={user?.user_metadata?.avatar_url} />
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {user?.user_metadata?.full_name?.charAt(0) || "S"}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </HoverCardTrigger>
                  <HoverCardContent className="w-40" align="end">
                    <Button
                      variant="ghost"
                      className="w-full justify-start"
                      onClick={() => navigate('/profile')}
                    >
                      <UserIcon className="w-4 h-4 mr-2" />
                      View Profile
                    </Button>
                  </HoverCardContent>
                </HoverCard>
              </div>
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <div className="container mx-auto px-6 py-12">
          {/* Welcome Section */}
          <div className="mb-12 animate-fade-in">
            <h1 className="text-4xl font-bold mb-2">
              Welcome back, {user?.user_metadata?.full_name || "Student"}!
            </h1>
            <p className="text-muted-foreground text-lg">Ready to sprint towards your IBA goals?</p>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
            {/* Current Level Card */}
            <Card className="border-border/40 card-hover-glow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Current Level</CardTitle>
                  <Trophy className="w-5 h-5 text-accent" />
                </div>
              </CardHeader>
              <CardContent>
                {loadingVP ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-16 h-16 rounded-full skeleton" />
                      <div className="flex-1 space-y-2">
                        <div className="h-6 w-32 skeleton" />
                        <div className="h-4 w-24 skeleton" />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <LevelBadge level={currentLevel} size="md" />
                    <div>
                      <p className="text-xl font-bold gradient-text">{currentLevel.name}</p>
                      <p className="text-xs text-muted-foreground mt-1">{currentLevel.track.replace(/_/g, ' ')}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Velocity Points Card */}
            <Card className="border-border/40 card-hover-glow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Velocity Points</CardTitle>
                  <img src="/assets/velocity-coin.png" alt="VP" className="w-5 h-5 object-contain" />
                </div>
              </CardHeader>
              <CardContent>
                {loadingVP ? (
                  <div className="space-y-2">
                    <div className="h-10 w-40 skeleton" />
                    <div className="h-4 w-28 skeleton" />
                  </div>
                ) : (
                  <>
                    <p className="text-3xl font-bold gradient-text">
                      {formatVPFull(totalVp)}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">Total VP earned</p>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Study Streak Card */}
            <Card className="border-border/40 card-hover-glow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Study Streak</CardTitle>
                  <Zap className="w-5 h-5 text-accent" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold gradient-text">7 Days</p>
                <p className="text-sm text-muted-foreground mt-1">+500 VP per day!</p>
              </CardContent>
            </Card>
          </div>

          {/* Track Progress Section */}
          <div className="mb-12 animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
            {!loadingVP && (
              <TrackProgress totalVp={totalVp} currentLevel={currentLevel} />
            )}
          </div>

          {/* Quick Actions */}
          <div className="mb-12 animate-fade-in-up" style={{ animationDelay: "0.3s" }}>
            <h2 className="text-2xl font-bold mb-6">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="border-border/40 card-hover-glow cursor-pointer group" onClick={() => navigate("/vocabpoly")}>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg gradient-accent flex items-center justify-center">
                      <Sparkles className="w-6 h-6 text-primary-foreground" />
                    </div>
                    <div>
                      <CardTitle>VocabPoly</CardTitle>
                      <CardDescription>Master vocabulary through engaging challenges</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Button className="w-full btn-hover-glow gradient-primary">
                    Start Game
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-border/40 card-hover-glow cursor-pointer group">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg gradient-accent flex items-center justify-center">
                      <BookOpen className="w-6 h-6 text-primary-foreground" />
                    </div>
                    <div>
                      <CardTitle>Vocab Sprint</CardTitle>
                      <CardDescription>Test your vocabulary skills</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Button className="w-full btn-hover-glow gradient-primary">
                    Start Sprint
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-border/40 card-hover-glow cursor-pointer group">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg gradient-accent flex items-center justify-center">
                      <Target className="w-6 h-6 text-primary-foreground" />
                    </div>
                    <div>
                      <CardTitle>Math Sprint</CardTitle>
                      <CardDescription>Sharpen your math abilities</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Button className="w-full btn-hover-glow gradient-primary">
                    Start Sprint
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Daily Goals */}
          <div className="animate-fade-in-up" style={{ animationDelay: "0.3s" }}>
            <DailyGoals />
          </div>

          {/* Subject Mastery */}
          <div className="animate-fade-in-up" style={{ animationDelay: "0.4s" }}>
            <h2 className="text-2xl font-bold mb-6 mt-12">Subject Mastery</h2>
            <SubjectMastery />
          </div>
        </div>
      </div>

      {/* Level Up Animation */}
      {showLevelUpAnimation && levelUpData && (
        <LevelUpAnimation
          level={levelUpData}
          open={showLevelUpAnimation}
          onClose={closeLevelUpAnimation}
        />
      )}
    </div>
  );
};

export default Dashboard;
