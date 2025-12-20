import { Button } from "@/components/ui/button";
import { Zap } from "lucide-react";

const Navigation = () => {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-xl">
      <div className="container mx-auto px-6">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl gradient-accent flex items-center justify-center">
              <Zap className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Sprint IBA
            </span>
          </div>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-foreground hover:text-accent transition-colors font-medium">
              Features
            </a>
            <a href="#leaderboard" className="text-foreground hover:text-accent transition-colors font-medium">
              Leaderboard
            </a>
            <a href="#community" className="text-foreground hover:text-accent transition-colors font-medium">
              Community
            </a>
          </div>

          {/* CTA Buttons */}
          <div className="flex items-center gap-4">
            <Button variant="ghost" className="hidden sm:inline-flex hover:text-accent" onClick={() => window.location.href = '/auth'}>
              Sign In
            </Button>
            <Button className="gradient-primary text-primary-foreground hover:shadow-accent transition-all duration-300" onClick={() => window.location.href = '/auth'}>
              Get Started
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
