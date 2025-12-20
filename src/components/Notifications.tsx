import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    HoverCard,
    HoverCardContent,
    HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Badge } from "@/components/ui/badge";

const Notifications = () => {
    const activities = [
        { action: "Completed Vocab Sprint", points: "+50 pts", time: "2 hours ago", badge: "🎯" },
        { action: "Reached Top 20", points: "+100 pts", time: "Yesterday", badge: "🏆" },
        { action: "Posted in Community", points: "+25 pts", time: "2 days ago", badge: "💬" },
    ];

    return (
        <HoverCard>
            <HoverCardTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                    <Bell className="w-5 h-5" />
                    <span className="absolute top-1 right-1 w-2 h-2 bg-accent rounded-full animate-pulse" />
                </Button>
            </HoverCardTrigger>
            <HoverCardContent className="w-80 p-0" align="end">
                <div className="p-4 border-b border-border/40">
                    <h4 className="text-sm font-semibold">Recent Activity</h4>
                </div>
                <div className="p-2">
                    {activities.map((activity, i) => (
                        <div key={i} className="flex items-center justify-between p-3 hover:bg-muted/50 rounded-lg transition-colors">
                            <div className="flex items-center gap-3">
                                <span className="text-xl">{activity.badge}</span>
                                <div>
                                    <p className="text-sm font-medium">{activity.action}</p>
                                    <p className="text-xs text-muted-foreground">{activity.time}</p>
                                </div>
                            </div>
                            <Badge variant="secondary" className="text-xs gradient-accent text-primary-foreground">
                                {activity.points}
                            </Badge>
                        </div>
                    ))}
                </div>
            </HoverCardContent>
        </HoverCard>
    );
};

export default Notifications;
