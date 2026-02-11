"use client";

import { Card } from "@/components/ui/card";
import { Trophy } from "lucide-react";
import VPLeaderboard from "@/components/leaderboard/VPLeaderboard";

const Leaderboard = () => {
  return (
    <section className="py-24 px-6 gradient-subtle">
      <div className="container mx-auto max-w-7xl">
        <div className="text-center space-y-4 mb-12">
          <h2 className="text-4xl md:text-5xl font-bold">Top Performers</h2>
          <p className="text-xl text-muted-foreground">
            See where you stand among the best
          </p>
        </div>

        <Card className="shadow-card overflow-hidden border-border/50">
          <div className="gradient-primary p-6 text-primary-foreground">
            <h3 className="text-2xl font-semibold flex items-center gap-3">
              <Trophy className="w-6 h-6" />
              Leaderboard Rankings
            </h3>
          </div>

          <div className="p-6">
            <VPLeaderboard limit={10} />
          </div>
        </Card>
      </div>
    </section>
  );
};

export default Leaderboard;
