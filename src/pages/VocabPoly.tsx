import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Sparkles, 
  Trophy, 
  Flame, 
  Clock, 
  Heart, 
  Zap,
  Play,
  RotateCcw,
  Home,
  Volume2,
  VolumeX,
  Star
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { getRandomWords, getWrongDefinitions, VocabWord } from "@/data/vocabularyData";
import { cn } from "@/lib/utils";

type GameState = "menu" | "playing" | "result";
type Difficulty = "easy" | "medium" | "hard" | "mixed";

interface GameStats {
  score: number;
  streak: number;
  bestStreak: number;
  correct: number;
  wrong: number;
  lives: number;
}

const VocabPoly = () => {
  const navigate = useNavigate();
  const [gameState, setGameState] = useState<GameState>("menu");
  const [difficulty, setDifficulty] = useState<Difficulty>("mixed");
  const [currentWord, setCurrentWord] = useState<VocabWord | null>(null);
  const [options, setOptions] = useState<string[]>([]);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [timeLeft, setTimeLeft] = useState(15);
  const [stats, setStats] = useState<GameStats>({
    score: 0,
    streak: 0,
    bestStreak: 0,
    correct: 0,
    wrong: 0,
    lives: 3,
  });
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [questionNumber, setQuestionNumber] = useState(0);
  const totalQuestions = 10;

  const loadNextWord = useCallback(() => {
    const difficultyFilter = difficulty === "mixed" ? undefined : difficulty;
    const words = getRandomWords(1, difficultyFilter);
    if (words.length === 0) return;

    const word = words[0];
    const wrongDefs = getWrongDefinitions(word, 3);
    const allOptions = [word.definition, ...wrongDefs].sort(() => Math.random() - 0.5);

    setCurrentWord(word);
    setOptions(allOptions);
    setSelectedOption(null);
    setIsCorrect(null);
    setTimeLeft(difficulty === "hard" ? 10 : difficulty === "medium" ? 12 : 15);
  }, [difficulty]);

  const startGame = () => {
    setStats({
      score: 0,
      streak: 0,
      bestStreak: 0,
      correct: 0,
      wrong: 0,
      lives: 3,
    });
    setQuestionNumber(1);
    setGameState("playing");
    loadNextWord();
  };

  const handleAnswer = (index: number) => {
    if (selectedOption !== null || !currentWord) return;

    setSelectedOption(index);
    const correct = options[index] === currentWord.definition;
    setIsCorrect(correct);

    if (correct) {
      const timeBonus = Math.floor(timeLeft * 10);
      const streakBonus = stats.streak * 5;
      const basePoints = difficulty === "hard" ? 100 : difficulty === "medium" ? 75 : 50;
      const totalPoints = basePoints + timeBonus + streakBonus;

      setStats(prev => ({
        ...prev,
        score: prev.score + totalPoints,
        streak: prev.streak + 1,
        bestStreak: Math.max(prev.bestStreak, prev.streak + 1),
        correct: prev.correct + 1,
      }));
      toast.success(`+${totalPoints} points!`, { duration: 1500 });
    } else {
      setStats(prev => ({
        ...prev,
        streak: 0,
        wrong: prev.wrong + 1,
        lives: prev.lives - 1,
      }));
      toast.error("Incorrect!", { duration: 1500 });
    }

    // Move to next question or end game
    setTimeout(() => {
      if (!correct && stats.lives <= 1) {
        setGameState("result");
      } else if (questionNumber >= totalQuestions) {
        setGameState("result");
      } else {
        setQuestionNumber(prev => prev + 1);
        loadNextWord();
      }
    }, 1500);
  };

  // Timer effect
  useEffect(() => {
    if (gameState !== "playing" || selectedOption !== null) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          // Time's up
          setStats(s => ({
            ...s,
            streak: 0,
            wrong: s.wrong + 1,
            lives: s.lives - 1,
          }));
          
          setTimeout(() => {
            if (stats.lives <= 1) {
              setGameState("result");
            } else if (questionNumber >= totalQuestions) {
              setGameState("result");
            } else {
              setQuestionNumber(p => p + 1);
              loadNextWord();
            }
          }, 500);
          
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameState, selectedOption, stats.lives, questionNumber, loadNextWord]);

  const getOptionClass = (index: number) => {
    if (selectedOption === null) {
      return "border-border hover:border-accent hover:bg-accent/5 cursor-pointer";
    }
    
    const isThisCorrect = options[index] === currentWord?.definition;
    
    if (isThisCorrect) {
      return "border-green-500 bg-green-500/10";
    }
    
    if (selectedOption === index && !isThisCorrect) {
      return "border-destructive bg-destructive/10";
    }
    
    return "border-border opacity-50";
  };

  const getDifficultyColor = (diff: Difficulty) => {
    switch (diff) {
      case "easy": return "bg-green-500/10 text-green-600 border-green-500/30";
      case "medium": return "bg-amber-500/10 text-amber-600 border-amber-500/30";
      case "hard": return "bg-red-500/10 text-red-600 border-red-500/30";
      default: return "bg-accent/10 text-accent border-accent/30";
    }
  };

  // Menu Screen
  if (gameState === "menu") {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        {/* Header */}
        <header className="border-b border-border/40 p-4">
          <div className="flex items-center justify-between max-w-4xl mx-auto">
            <Button variant="ghost" onClick={() => navigate("/dashboard")}>
              <Home className="w-4 h-4 mr-2" />
              Dashboard
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSoundEnabled(!soundEnabled)}
            >
              {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </Button>
          </div>
        </header>

        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md w-full space-y-8 text-center">
            {/* Logo */}
            <div className="space-y-4">
              <div className="w-24 h-24 mx-auto rounded-2xl gradient-accent flex items-center justify-center shadow-lg">
                <Sparkles className="w-12 h-12 text-primary-foreground" />
              </div>
              <h1 className="text-4xl font-bold">
                <span className="text-accent">Vocab</span>Poly
              </h1>
              <p className="text-muted-foreground">
                Master vocabulary through engaging word challenges
              </p>
            </div>

            {/* Difficulty Selection */}
            <div className="space-y-3">
              <p className="text-sm font-medium text-muted-foreground">Select Difficulty</p>
              <div className="grid grid-cols-2 gap-3">
                {(["easy", "medium", "hard", "mixed"] as Difficulty[]).map((diff) => (
                  <button
                    key={diff}
                    onClick={() => setDifficulty(diff)}
                    className={cn(
                      "p-4 rounded-xl border-2 transition-all capitalize font-medium",
                      difficulty === diff
                        ? getDifficultyColor(diff) + " border-2"
                        : "border-border hover:border-accent/50"
                    )}
                  >
                    {diff}
                  </button>
                ))}
              </div>
            </div>

            {/* Start Button */}
            <Button 
              size="lg" 
              className="w-full gradient-accent text-accent-foreground text-lg h-14"
              onClick={startGame}
            >
              <Play className="w-5 h-5 mr-2" />
              Start Game
            </Button>

            {/* Game Info */}
            <div className="grid grid-cols-3 gap-4 text-center pt-4">
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold text-accent">{totalQuestions}</p>
                <p className="text-xs text-muted-foreground">Questions</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold text-accent">3</p>
                <p className="text-xs text-muted-foreground">Lives</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold text-accent">15s</p>
                <p className="text-xs text-muted-foreground">Per Word</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Result Screen
  if (gameState === "result") {
    const accuracy = stats.correct + stats.wrong > 0 
      ? Math.round((stats.correct / (stats.correct + stats.wrong)) * 100) 
      : 0;

    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="border-b border-border/40 p-4">
          <div className="flex items-center justify-center">
            <div className="flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-accent" />
              <span className="text-xl font-bold">VocabPoly</span>
            </div>
          </div>
        </header>

        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md w-full space-y-8 text-center">
            {/* Trophy */}
            <div className="space-y-4">
              <div className="w-24 h-24 mx-auto rounded-full bg-accent/10 flex items-center justify-center">
                <Trophy className="w-12 h-12 text-accent" />
              </div>
              <h1 className="text-3xl font-bold">Game Over!</h1>
              <p className="text-muted-foreground">Great effort! Keep practicing to improve.</p>
            </div>

            {/* Score */}
            <div className="p-6 rounded-2xl bg-primary/5 border border-primary/20">
              <p className="text-sm text-muted-foreground mb-2">Final Score</p>
              <p className="text-5xl font-bold text-primary">{stats.score}</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
              <Card className="border-border/40">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-green-500">{stats.correct}</p>
                  <p className="text-sm text-muted-foreground">Correct</p>
                </CardContent>
              </Card>
              <Card className="border-border/40">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-destructive">{stats.wrong}</p>
                  <p className="text-sm text-muted-foreground">Wrong</p>
                </CardContent>
              </Card>
              <Card className="border-border/40">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-accent">{stats.bestStreak}</p>
                  <p className="text-sm text-muted-foreground">Best Streak</p>
                </CardContent>
              </Card>
              <Card className="border-border/40">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-primary">{accuracy}%</p>
                  <p className="text-sm text-muted-foreground">Accuracy</p>
                </CardContent>
              </Card>
            </div>

            {/* Actions */}
            <div className="space-y-3">
              <Button 
                size="lg" 
                className="w-full gradient-accent text-accent-foreground"
                onClick={startGame}
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Play Again
              </Button>
              <Button 
                variant="outline" 
                size="lg" 
                className="w-full"
                onClick={() => navigate("/dashboard")}
              >
                <Home className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Playing Screen
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header with Stats */}
      <header className="border-b border-border/40 bg-background/95 backdrop-blur sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Lives */}
            <div className="flex items-center gap-1">
              {[...Array(3)].map((_, i) => (
                <Heart
                  key={i}
                  className={cn(
                    "w-6 h-6 transition-colors",
                    i < stats.lives 
                      ? "fill-red-500 text-red-500" 
                      : "text-muted-foreground/30"
                  )}
                />
              ))}
            </div>

            {/* Score & Streak */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Star className="w-5 h-5 text-accent" />
                <span className="font-bold text-lg">{stats.score}</span>
              </div>
              {stats.streak > 0 && (
                <Badge className="bg-orange-500/10 text-orange-500 border-orange-500/30">
                  <Flame className="w-3 h-3 mr-1" />
                  {stats.streak} Streak
                </Badge>
              )}
            </div>

            {/* Timer */}
            <div className={cn(
              "flex items-center gap-2 px-3 py-1 rounded-full",
              timeLeft <= 5 ? "bg-destructive/10 text-destructive" : "bg-muted"
            )}>
              <Clock className="w-4 h-4" />
              <span className="font-mono font-bold">{timeLeft}s</span>
            </div>
          </div>
        </div>
      </header>

      {/* Progress */}
      <div className="max-w-3xl mx-auto w-full px-4 py-2">
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">
            {questionNumber}/{totalQuestions}
          </span>
          <Progress value={(questionNumber / totalQuestions) * 100} className="h-2" />
        </div>
      </div>

      {/* Question Area */}
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="max-w-2xl w-full space-y-8">
          {/* Word Card */}
          <Card className="border-2 border-accent/30 bg-accent/5">
            <CardContent className="p-8 text-center">
              <Badge className={cn("mb-4", getDifficultyColor(currentWord?.difficulty || "easy"))}>
                {currentWord?.difficulty}
              </Badge>
              <h2 className="text-4xl font-bold text-foreground mb-2">
                {currentWord?.word}
              </h2>
              <p className="text-sm text-muted-foreground">
                Select the correct definition
              </p>
            </CardContent>
          </Card>

          {/* Options */}
          <div className="grid gap-3">
            {options.map((option, index) => (
              <button
                key={index}
                onClick={() => handleAnswer(index)}
                disabled={selectedOption !== null}
                className={cn(
                  "w-full text-left p-4 rounded-xl border-2 transition-all",
                  getOptionClass(index)
                )}
              >
                <div className="flex items-start gap-3">
                  <span className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-medium shrink-0">
                    {String.fromCharCode(65 + index)}
                  </span>
                  <span className="text-foreground leading-relaxed">{option}</span>
                </div>
              </button>
            ))}
          </div>

          {/* Example (shown after answer) */}
          {selectedOption !== null && currentWord?.example && (
            <div className="p-4 rounded-lg bg-muted/50 border border-border/40 animate-fade-in">
              <p className="text-sm text-muted-foreground">
                <span className="font-medium">Example:</span> "{currentWord.example}"
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VocabPoly;
