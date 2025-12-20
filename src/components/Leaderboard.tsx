import { Card } from "@/components/ui/card";
import { Trophy, Medal, Award } from "lucide-react";

const mockLeaderboard = [
  { rank: 1, name: "Sarah Ahmed", score: 2850, badge: "🏆", icon: Trophy, color: "text-yellow-500" },
  { rank: 2, name: "Rafi Khan", score: 2720, badge: "🥈", icon: Medal, color: "text-slate-400" },
  { rank: 3, name: "Nadia Islam", score: 2650, badge: "🥉", icon: Award, color: "text-amber-600" },
  { rank: 4, name: "Fahim Rahman", score: 2580, badge: "", icon: null, color: "" },
  { rank: 5, name: "Priya Das", score: 2490, badge: "", icon: null, color: "" },
];

const Leaderboard = () => {
  return (
    <section className="py-24 px-6 gradient-subtle">
      <div className="container mx-auto max-w-4xl">
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

          <div className="divide-y divide-border">
            {mockLeaderboard.map((player) => (
              <div
                key={player.rank}
                className={`p-6 flex items-center justify-between hover:bg-muted/50 transition-colors ${
                  player.rank <= 3 ? 'bg-accent/5' : ''
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-12 h-12 rounded-full bg-muted font-bold text-lg">
                    {player.icon ? (
                      <player.icon className={`w-6 h-6 ${player.color}`} />
                    ) : (
                      <span className="text-muted-foreground">{player.rank}</span>
                    )}
                  </div>
                  
                  <div>
                    <p className="font-semibold text-lg">{player.name}</p>
                    <p className="text-sm text-muted-foreground">Rank #{player.rank}</p>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-2xl font-bold text-accent">{player.score}</p>
                  <p className="text-sm text-muted-foreground">points</p>
                </div>
              </div>
            ))}
          </div>

          <div className="p-6 bg-muted/30 text-center">
            <p className="text-muted-foreground">
              Join the competition and claim your spot! 🚀
            </p>
          </div>
        </Card>
      </div>
    </section>
  );
};

export default Leaderboard;
