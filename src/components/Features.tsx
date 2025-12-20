import { Card } from "@/components/ui/card";
import { Gamepad2, TrendingUp, MessageCircle, Award } from "lucide-react";

const features = [
  {
    icon: Gamepad2,
    title: "Interactive Sprint Games",
    description: "Master vocabulary and math through engaging, time-based challenges. Compete in vocab sprints and math battles to sharpen your skills.",
    gradient: "from-accent/20 to-accent/5",
  },
  {
    icon: TrendingUp,
    title: "Centralized Leaderboard",
    description: "Track your progress and see how you stack up against other aspirants. Climb the ranks and celebrate your achievements.",
    gradient: "from-primary/20 to-primary/5",
  },
  {
    icon: MessageCircle,
    title: "Vibrant Community",
    description: "Share insights, ask questions, and connect with fellow aspirants. Create posts, comment, and build your network.",
    gradient: "from-accent/20 to-accent/5",
  },
  {
    icon: Award,
    title: "Achievement Showcase",
    description: "Highlight your milestones and accomplishments. Share your success stories and inspire others on their journey.",
    gradient: "from-primary/20 to-primary/5",
  },
];

const Features = () => {
  return (
    <section className="py-24 px-6">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center space-y-4 mb-16">
          <h2 className="text-4xl md:text-5xl font-bold">Everything You Need to Excel</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            A comprehensive platform designed specifically for IBA admission test preparation
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {features.map((feature, index) => (
            <Card
              key={index}
              className="group p-8 hover:shadow-card-hover transition-all duration-300 hover:-translate-y-1 border-border/50 bg-card"
            >
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                <feature.icon className="w-7 h-7 text-accent" />
              </div>
              
              <h3 className="text-2xl font-semibold mb-3 group-hover:text-accent transition-colors">
                {feature.title}
              </h3>
              
              <p className="text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
