import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MessageCircle, ThumbsUp, Share2 } from "lucide-react";

const mockPosts = [
  {
    id: 1,
    author: "Ahmed Hassan",
    initials: "AH",
    timeAgo: "2 hours ago",
    content: "Just scored 95% on the Math Sprint! 🎉 The key is practicing speed and accuracy together. Anyone want to compete?",
    likes: 24,
    comments: 8,
  },
  {
    id: 2,
    author: "Tasneem Haque",
    initials: "TH",
    timeAgo: "5 hours ago",
    content: "Sharing my vocab study technique: I use flashcards + context sentences. Helped me improve by 30% in just a week! 📚",
    likes: 42,
    comments: 15,
  },
  {
    id: 3,
    author: "Karim Abdullah",
    initials: "KA",
    timeAgo: "1 day ago",
    content: "Looking for study partners for daily practice sessions. Let's form a group and stay consistent! 💪",
    likes: 18,
    comments: 12,
  },
];

const CommunityPosts = () => {
  return (
    <section className="py-24 px-6">
      <div className="container mx-auto max-w-4xl">
        <div className="text-center space-y-4 mb-12">
          <h2 className="text-4xl md:text-5xl font-bold">Community Insights</h2>
          <p className="text-xl text-muted-foreground">
            Learn from fellow aspirants and share your journey
          </p>
        </div>

        <div className="space-y-6">
          {mockPosts.map((post) => (
            <Card
              key={post.id}
              className="p-6 hover:shadow-card-hover transition-all duration-300 border-border/50"
            >
              <div className="flex items-start gap-4">
                <Avatar className="w-12 h-12 border-2 border-accent/20">
                  <AvatarFallback className="gradient-accent text-primary-foreground font-semibold">
                    {post.initials}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-lg">{post.author}</p>
                      <p className="text-sm text-muted-foreground">{post.timeAgo}</p>
                    </div>
                  </div>

                  <p className="text-foreground leading-relaxed">{post.content}</p>

                  <div className="flex items-center gap-6 pt-2">
                    <button className="flex items-center gap-2 text-muted-foreground hover:text-accent transition-colors group">
                      <ThumbsUp className="w-5 h-5 group-hover:scale-110 transition-transform" />
                      <span className="font-medium">{post.likes}</span>
                    </button>

                    <button className="flex items-center gap-2 text-muted-foreground hover:text-accent transition-colors group">
                      <MessageCircle className="w-5 h-5 group-hover:scale-110 transition-transform" />
                      <span className="font-medium">{post.comments}</span>
                    </button>

                    <button className="flex items-center gap-2 text-muted-foreground hover:text-accent transition-colors group">
                      <Share2 className="w-5 h-5 group-hover:scale-110 transition-transform" />
                      <span className="font-medium">Share</span>
                    </button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CommunityPosts;
