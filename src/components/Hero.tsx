import { Button } from "@/components/ui/button";
import { ArrowRight, Trophy, Users, Zap } from "lucide-react";

const Hero = () => {
  return (
    <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden gradient-subtle">
      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 right-20 w-72 h-72 bg-accent/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 left-20 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <div className="container relative z-10 px-6 py-20">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 text-accent border border-accent/20 animate-fade-in">
            <Zap className="w-4 h-4" />
            <span className="text-sm font-medium">Your IBA Journey Starts Here</span>
          </div>

          {/* Main Heading */}
          <h1 className="text-5xl md:text-7xl font-bold leading-tight animate-fade-in-up">
            Level Up Your{" "}
            <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient">
              IBA Admission
            </span>{" "}
            Journey
          </h1>

          {/* Subheading */}
          <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            Connect with fellow aspirants, compete in interactive games, track your progress, and share knowledge in a vibrant community built for success.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
            <Button size="lg" className="group gradient-primary text-primary-foreground px-8 py-6 text-lg hover:shadow-accent transition-all duration-300">
              Get Started Free
              <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button size="lg" variant="outline" className="px-8 py-6 text-lg border-2 hover:border-accent hover:text-accent transition-all duration-300">
              Explore Features
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-8 max-w-2xl mx-auto pt-12 animate-fade-in-up" style={{ animationDelay: '0.6s' }}>
            <div className="space-y-2">
              <div className="flex items-center justify-center gap-2 text-accent">
                <Users className="w-5 h-5" />
                <span className="text-3xl font-bold">5K+</span>
              </div>
              <p className="text-sm text-muted-foreground">Active Aspirants</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-center gap-2 text-accent">
                <Trophy className="w-5 h-5" />
                <span className="text-3xl font-bold">10K+</span>
              </div>
              <p className="text-sm text-muted-foreground">Games Played</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-center gap-2 text-accent">
                <Zap className="w-5 h-5" />
                <span className="text-3xl font-bold">95%</span>
              </div>
              <p className="text-sm text-muted-foreground">Success Rate</p>
            </div>
          </div>
        </div>
      </div>

    </section>
  );
};

export default Hero;
