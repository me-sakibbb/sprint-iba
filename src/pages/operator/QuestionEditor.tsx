import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";

const QuestionEditor = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const isNew = !id || id === "new";
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(!isNew);

    const [formData, setFormData] = useState({
        question_text: "",
        options: ["", "", "", "", ""],
        correct_answer: "",
        explanation: "",
        difficulty: "Easy",
        subtopic: "",
        topic: "",
        image_url: ""
    });

    useEffect(() => {
        if (!isNew && id) {
            fetchQuestion(id);
        }
    }, [id, isNew]);

    const fetchQuestion = async (questionId: string) => {
        try {
            const { data, error } = await supabase
                .from('questions')
                .select('*')
                .eq('id', questionId)
                .single();

            if (error) throw error;
            if (data) {
                // Handle options which can be strings or objects
                const loadedOptions = Array.isArray(data.options)
                    ? data.options.map((opt: any) => {
                        if (typeof opt === 'object' && opt !== null) {
                            return opt.text || "";
                        }
                        return String(opt);
                    })
                    : ["", "", "", "", ""];

                // Ensure we have at least 5 options
                while (loadedOptions.length < 5) {
                    loadedOptions.push("");
                }

                setFormData({
                    question_text: data.question_text || "",
                    options: loadedOptions,
                    correct_answer: data.correct_answer || "",
                    explanation: data.explanation || "",
                    difficulty: data.difficulty || "Easy",
                    subtopic: data.subtopic || "",
                    topic: data.topic || "",
                    image_url: data.image_url || ""
                });
            }
        } catch (error: any) {
            toast.error("Failed to fetch question");
            console.error(error);
        } finally {
            setFetching(false);
        }
    };

    const handleOptionChange = (index: number, value: string) => {
        const newOptions = [...formData.options];
        newOptions[index] = value;
        setFormData({ ...formData, options: newOptions });
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            if (!formData.question_text) throw new Error("Question text is required");
            if (!formData.correct_answer) throw new Error("Correct answer is required");
            if (!formData.topic) throw new Error("Topic is required");
            if (!formData.subtopic) throw new Error("Subtopic is required");

            // Convert options back to objects for storage
            const optionsPayload = formData.options.map((opt, i) => ({
                id: String.fromCharCode(65 + i),
                text: opt
            }));

            const payload = {
                question_text: formData.question_text,
                options: optionsPayload,
                correct_answer: formData.correct_answer,
                explanation: formData.explanation,
                difficulty: formData.difficulty,
                subtopic: formData.subtopic,
                topic: formData.topic,
                image_url: formData.image_url || null
            };

            let error;
            if (isNew) {
                const { error: insertError } = await supabase
                    .from('questions')
                    .insert(payload);
                error = insertError;
            } else {
                const { error: updateError } = await supabase
                    .from('questions')
                    .update(payload)
                    .eq('id', id);
                error = updateError;
            }

            if (error) throw error;
            toast.success(isNew ? "Question created" : "Question updated");
            navigate("/operator/dashboard");
        } catch (error: any) {
            toast.error(error.message || "Failed to save question");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    if (fetching) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background p-8">
            <div className="max-w-6xl mx-auto space-y-8">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate("/operator/dashboard")}>
                        <ArrowLeft className="w-6 h-6" />
                    </Button>
                    <h1 className="text-3xl font-bold">{isNew ? "Create Question" : "Edit Question"}</h1>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Form */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Question Details</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-2">
                                <Label>Question Text (LaTeX supported)</Label>
                                <textarea
                                    value={formData.question_text}
                                    onChange={(e) => setFormData({ ...formData, question_text: e.target.value })}
                                    placeholder="Enter question text..."
                                    className="w-full p-2 border rounded min-h-[150px] bg-background"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Image URL (Optional)</Label>
                                <input
                                    type="text"
                                    value={formData.image_url}
                                    onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                                    placeholder="/questions/image.png"
                                    className="w-full p-2 border rounded bg-background"
                                />
                            </div>

                            <div className="space-y-4">
                                <Label>Options</Label>
                                {formData.options.map((opt, i) => (
                                    <div key={i} className="flex items-center gap-2">
                                        <span className="w-6 font-bold">{String.fromCharCode(65 + i)}</span>
                                        <input
                                            type="text"
                                            value={opt}
                                            onChange={(e) => handleOptionChange(i, e.target.value)}
                                            placeholder={`Option ${String.fromCharCode(65 + i)}`}
                                            className="w-full p-2 border rounded bg-background"
                                        />
                                    </div>
                                ))}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Correct Answer</Label>
                                    <select
                                        value={formData.correct_answer}
                                        onChange={(e) => setFormData({ ...formData, correct_answer: e.target.value })}
                                        className="w-full p-2 border rounded bg-background"
                                    >
                                        <option value="">Select Answer</option>
                                        {formData.options.map((_, i) => (
                                            <option key={i} value={String.fromCharCode(65 + i)}>
                                                {String.fromCharCode(65 + i)}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Difficulty</Label>
                                    <select
                                        value={formData.difficulty}
                                        onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
                                        className="w-full p-2 border rounded bg-background"
                                    >
                                        <option value="Easy">Easy</option>
                                        <option value="Medium">Medium</option>
                                        <option value="Hard">Hard</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Topic</Label>
                                    <input
                                        type="text"
                                        value={formData.topic}
                                        onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                                        placeholder="Topic"
                                        className="w-full p-2 border rounded bg-background"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Subtopic (Unit)</Label>
                                    <input
                                        type="text"
                                        value={formData.subtopic}
                                        onChange={(e) => setFormData({ ...formData, subtopic: e.target.value })}
                                        placeholder="Subtopic"
                                        className="w-full p-2 border rounded bg-background"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Explanation</Label>
                                <textarea
                                    value={formData.explanation}
                                    onChange={(e) => setFormData({ ...formData, explanation: e.target.value })}
                                    placeholder="Explain the solution..."
                                    className="w-full p-2 border rounded min-h-[100px] bg-background"
                                />
                            </div>

                            <Button className="w-full" onClick={handleSave} disabled={loading}>
                                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                <Save className="w-4 h-4 mr-2" />
                                Save Question
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Preview */}
                    <Card className="h-fit sticky top-8">
                        <CardHeader>
                            <CardTitle>Preview</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="prose dark:prose-invert max-w-none">
                                <div className="text-lg font-medium">
                                    {formData.question_text || "Question text will appear here..."}
                                </div>

                                {formData.image_url && (
                                    <div className="my-4">
                                        <img
                                            src={formData.image_url}
                                            alt="Question Diagram"
                                            className="max-w-full h-auto rounded-lg border"
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).style.display = 'none';
                                            }}
                                        />
                                    </div>
                                )}

                                <div className="space-y-2 mt-4">
                                    {formData.options.map((opt, i) => (
                                        <div key={i} className={`p-3 rounded-lg border ${formData.correct_answer === String.fromCharCode(65 + i)
                                            ? "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800"
                                            : "bg-card"
                                            }`}>
                                            <span className="font-bold mr-2">{String.fromCharCode(65 + i)}.</span>
                                            {opt || "Option text..."}
                                        </div>
                                    ))}
                                </div>

                                {formData.explanation && (
                                    <div className="mt-6 p-4 bg-muted rounded-lg">
                                        <h4 className="font-bold mb-2">Explanation:</h4>
                                        {formData.explanation}
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default QuestionEditor;
