import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Search, Edit, Trash2, Loader2, Filter, X, Flag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const OperatorDashboard = () => {
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState("");
    const [questions, setQuestions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Filter states
    const [topicFilter, setTopicFilter] = useState<string | null>(null);
    const [subtopicFilter, setSubtopicFilter] = useState<string | null>(null);
    const [difficultyFilter, setDifficultyFilter] = useState<string | null>(null);

    // Available options
    const [availableTopics, setAvailableTopics] = useState<string[]>([]);
    const [availableSubtopics, setAvailableSubtopics] = useState<string[]>([]);

    const [page, setPage] = useState(0);
    const ITEMS_PER_PAGE = 20;

    useEffect(() => {
        fetchMetadata();
    }, []);

    useEffect(() => {
        setPage(0); // Reset page when filters change
        fetchQuestions();
    }, [topicFilter, subtopicFilter, difficultyFilter, searchTerm]);

    useEffect(() => {
        fetchQuestions();
    }, [page]);

    const fetchMetadata = async () => {
        try {
            // Fetch distinct topics
            const { data: topicsData } = await supabase
                .from('questions')
                .select('topic')
                .not('topic', 'is', null);

            if (topicsData) {
                const uniqueTopics = Array.from(new Set(topicsData.map(t => t.topic))).sort();
                setAvailableTopics(uniqueTopics);
            }

            // Fetch distinct subtopics
            const { data: subtopicsData } = await supabase
                .from('questions')
                .select('subtopic')
                .not('subtopic', 'is', null);

            if (subtopicsData) {
                const uniqueSubtopics = Array.from(new Set(subtopicsData.map(t => t.subtopic))).sort();
                setAvailableSubtopics(uniqueSubtopics);
            }
        } catch (error) {
            console.error("Error fetching metadata:", error);
        }
    };

    const fetchQuestions = async () => {
        setLoading(true);
        try {
            let query = supabase
                .from('questions')
                .select('id, question_text, difficulty, subtopic, topic', { count: 'exact' });

            if (searchTerm) {
                query = query.ilike('question_text', `%${searchTerm}%`);
            }

            if (topicFilter) {
                query = query.eq('topic', topicFilter);
            }

            if (subtopicFilter) {
                query = query.eq('subtopic', subtopicFilter);
            }

            if (difficultyFilter) {
                query = query.eq('difficulty', difficultyFilter);
            }

            const from = page * ITEMS_PER_PAGE;
            const to = from + ITEMS_PER_PAGE - 1;

            const { data, error } = await query
                .order('created_at', { ascending: false })
                .range(from, to);

            if (error) throw error;
            setQuestions(data || []);
        } catch (error: any) {
            toast.error("Failed to fetch questions");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            setPage(0);
            fetchQuestions();
        }, 500);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this question?")) return;

        try {
            const { error } = await supabase
                .from('questions')
                .delete()
                .eq('id', id);

            if (error) throw error;
            toast.success("Question deleted");
            setQuestions(questions.filter(q => q.id !== id));
        } catch (error: any) {
            toast.error("Failed to delete question");
            console.error(error);
        }
    };

    const FilterHeader = ({
        title,
        options,
        value,
        onChange
    }: {
        title: string,
        options: string[],
        value: string | null,
        onChange: (val: string | null) => void
    }) => {
        const [open, setOpen] = useState(false);

        return (
            <div className="flex items-center space-x-2">
                <span>{title}</span>
                <Popover open={open} onOpenChange={setOpen}>
                    <PopoverTrigger asChild>
                        <Button
                            variant="ghost"
                            size="sm"
                            className={cn("h-8 w-8 p-0", value && "text-primary bg-primary/10")}
                        >
                            <Filter className="h-4 w-4" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[200px] p-0" align="start">
                        <Command>
                            <CommandInput placeholder={`Filter ${title}...`} />
                            <CommandList>
                                <CommandEmpty>No results found.</CommandEmpty>
                                <CommandGroup>
                                    <CommandItem
                                        onSelect={() => {
                                            onChange(null);
                                            setOpen(false);
                                        }}
                                    >
                                        <Check
                                            className={cn(
                                                "mr-2 h-4 w-4",
                                                value === null ? "opacity-100" : "opacity-0"
                                            )}
                                        />
                                        All
                                    </CommandItem>
                                    {options.map((option) => (
                                        <CommandItem
                                            key={option}
                                            onSelect={() => {
                                                onChange(option === value ? null : option);
                                                setOpen(false);
                                            }}
                                        >
                                            <Check
                                                className={cn(
                                                    "mr-2 h-4 w-4",
                                                    value === option ? "opacity-100" : "opacity-0"
                                                )}
                                            />
                                            {option}
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                            </CommandList>
                        </Command>
                    </PopoverContent>
                </Popover>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-background p-8">
            <div className="max-w-7xl mx-auto space-y-8">
                <div className="flex justify-between items-center">
                    <h1 className="text-3xl font-bold">Operator Dashboard</h1>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => navigate("/operator/reports")}>
                            <Flag className="w-4 h-4 mr-2" />
                            View Reports
                        </Button>
                        <Button onClick={() => navigate("/operator/editor/new")}>
                            <Plus className="w-4 h-4 mr-2" />
                            Add Question
                        </Button>
                    </div>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Manage Questions</CardTitle>
                        <div className="pt-4 space-y-4">
                            <div className="relative">
                                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search questions..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10"
                                />
                            </div>

                            {/* Active Filters Display */}
                            {(topicFilter || subtopicFilter || difficultyFilter) && (
                                <div className="flex flex-wrap gap-2">
                                    {topicFilter && (
                                        <Button variant="secondary" size="sm" onClick={() => setTopicFilter(null)} className="h-7 text-xs">
                                            Topic: {topicFilter} <X className="ml-1 h-3 w-3" />
                                        </Button>
                                    )}
                                    {subtopicFilter && (
                                        <Button variant="secondary" size="sm" onClick={() => setSubtopicFilter(null)} className="h-7 text-xs">
                                            Subtopic: {subtopicFilter} <X className="ml-1 h-3 w-3" />
                                        </Button>
                                    )}
                                    {difficultyFilter && (
                                        <Button variant="secondary" size="sm" onClick={() => setDifficultyFilter(null)} className="h-7 text-xs">
                                            Difficulty: {difficultyFilter} <X className="ml-1 h-3 w-3" />
                                        </Button>
                                    )}
                                    <Button variant="ghost" size="sm" onClick={() => {
                                        setTopicFilter(null);
                                        setSubtopicFilter(null);
                                        setDifficultyFilter(null);
                                    }} className="h-7 text-xs text-muted-foreground hover:text-foreground">
                                        Clear all
                                    </Button>
                                </div>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="flex justify-center py-8">
                                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                            </div>
                        ) : (
                            <>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-[400px]">Question</TableHead>
                                            <TableHead>
                                                <FilterHeader
                                                    title="Topic"
                                                    options={availableTopics}
                                                    value={topicFilter}
                                                    onChange={setTopicFilter}
                                                />
                                            </TableHead>
                                            <TableHead>
                                                <FilterHeader
                                                    title="Subtopic"
                                                    options={availableSubtopics}
                                                    value={subtopicFilter}
                                                    onChange={setSubtopicFilter}
                                                />
                                            </TableHead>
                                            <TableHead>
                                                <FilterHeader
                                                    title="Difficulty"
                                                    options={["Easy", "Medium", "Hard"]}
                                                    value={difficultyFilter}
                                                    onChange={setDifficultyFilter}
                                                />
                                            </TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {questions.map((q) => (
                                            <TableRow key={q.id}>
                                                <TableCell className="font-medium truncate max-w-[400px]">
                                                    {q.question_text}
                                                </TableCell>
                                                <TableCell>{q.topic}</TableCell>
                                                <TableCell>{q.subtopic}</TableCell>
                                                <TableCell>
                                                    <span className={`px-2 py-1 rounded-full text-xs ${q.difficulty === 'Easy' ? 'bg-green-100 text-green-800' :
                                                        q.difficulty === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                                                            'bg-red-100 text-red-800'
                                                        }`}>
                                                        {q.difficulty}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-right space-x-2">
                                                    <Button variant="ghost" size="icon" onClick={() => navigate(`/operator/editor/${q.id}`)}>
                                                        <Edit className="w-4 h-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" onClick={() => handleDelete(q.id)} className="text-red-500 hover:text-red-700">
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        {questions.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                                    No questions found
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                                <div className="flex justify-end items-center space-x-2 pt-4">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setPage(p => Math.max(0, p - 1))}
                                        disabled={page === 0}
                                    >
                                        Previous
                                    </Button>
                                    <span className="text-sm text-muted-foreground">
                                        Page {page + 1}
                                    </span>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setPage(p => p + 1)}
                                        disabled={questions.length < ITEMS_PER_PAGE}
                                    >
                                        Next
                                    </Button>
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default OperatorDashboard;
