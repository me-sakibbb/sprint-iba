
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Target, Plus, Trash2 } from "lucide-react";

interface Goal {
    id: number;
    text: string;
    done: boolean;
}

const DailyGoals = () => {
    const [goals, setGoals] = useState<Goal[]>(() => {
        const saved = localStorage.getItem("dailyGoals");
        return saved ? JSON.parse(saved) : [
            { id: 1, text: "Complete 1 Vocab Sprint", done: false },
            { id: 2, text: "Solve 5 Math Problems", done: false },
            { id: 3, text: "Read 1 English Article", done: false },
        ];
    });
    const [newGoal, setNewGoal] = useState("");

    useEffect(() => {
        localStorage.setItem("dailyGoals", JSON.stringify(goals));
    }, [goals]);

    const toggleGoal = (id: number) => {
        setGoals(goals.map(goal =>
            goal.id === id ? { ...goal, done: !goal.done } : goal
        ));
    };

    const addGoal = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newGoal.trim()) return;

        const goal: Goal = {
            id: Date.now(),
            text: newGoal,
            done: false
        };

        setGoals([...goals, goal]);
        setNewGoal("");
    };

    const deleteGoal = (id: number) => {
        setGoals(goals.filter(goal => goal.id !== id));
    };

    return (
        <Card className="border-border/40">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Target className="w-5 h-5 text-accent" />
                        <CardTitle>Daily Goals</CardTitle>
                    </div>
                    <span className="text-sm text-muted-foreground">
                        {goals.filter(g => g.done).length}/{goals.length} Done
                    </span>
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-6">
                    <form onSubmit={addGoal} className="flex gap-2">
                        <Input
                            placeholder="Add a new goal..."
                            value={newGoal}
                            onChange={(e) => setNewGoal(e.target.value)}
                            className="h-9"
                        />
                        <Button type="submit" size="sm" className="gradient-primary h-9 w-9 p-0">
                            <Plus className="w-4 h-4" />
                        </Button>
                    </form>

                    <div className="space-y-3">
                        {goals.map((goal) => (
                            <div key={goal.id} className="flex items-center justify-between group">
                                <div className="flex items-center space-x-2 flex-1">
                                    <Checkbox
                                        id={`goal - ${goal.id} `}
                                        checked={goal.done}
                                        onCheckedChange={() => toggleGoal(goal.id)}
                                    />
                                    <Label
                                        htmlFor={`goal - ${goal.id} `}
                                        className={`text - sm font - medium leading - none peer - disabled: cursor - not - allowed peer - disabled: opacity - 70 cursor - pointer ${goal.done ? 'line-through text-muted-foreground' : ''} `}
                                    >
                                        {goal.text}
                                    </Label>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                                    onClick={() => deleteGoal(goal.id)}
                                >
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                        ))}
                        {goals.length === 0 && (
                            <p className="text-center text-sm text-muted-foreground py-4">
                                No goals yet. Add one above!
                            </p>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

export default DailyGoals;

