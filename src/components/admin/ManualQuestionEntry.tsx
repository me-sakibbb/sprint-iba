import { useState } from 'react';
import { useQuestionExtraction } from '@/hooks/useQuestionExtraction';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, Plus, Trash2, Save } from 'lucide-react';

interface QuestionForm {
    id: string; // Temporary ID for UI key
    question_text: string;
    options: string[];
    correct_answer: string; // "0", "1", "2", "3"
    explanation: string;
    topic: string;
    subtopic: string;
    difficulty: string;
}

const INITIAL_QUESTION: QuestionForm = {
    id: '1',
    question_text: '',
    options: ['', '', '', ''],
    correct_answer: '0',
    explanation: '',
    topic: '',
    subtopic: '',
    difficulty: 'Medium',
};

export function ManualQuestionEntry({ onQuestionAdded }: { onQuestionAdded?: () => void }) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [activeTab, setActiveTab] = useState('single');

    // Single Question State
    const [singleQuestion, setSingleQuestion] = useState<QuestionForm>({ ...INITIAL_QUESTION, id: crypto.randomUUID() });

    // Passage Group State
    const [passageContent, setPassageContent] = useState('');
    const [passageQuestions, setPassageQuestions] = useState<QuestionForm[]>([{ ...INITIAL_QUESTION, id: crypto.randomUUID() }]);

    const handleSingleQuestionChange = (field: keyof QuestionForm, value: any) => {
        setSingleQuestion(prev => ({ ...prev, [field]: value }));
    };

    const handleOptionChange = (index: number, value: string) => {
        const newOptions = [...singleQuestion.options];
        newOptions[index] = value;
        setSingleQuestion(prev => ({ ...prev, options: newOptions }));
    };

    const handlePassageQuestionChange = (qId: string, field: keyof QuestionForm, value: any) => {
        setPassageQuestions(prev => prev.map(q => q.id === qId ? { ...q, [field]: value } : q));
    };

    const handlePassageOptionChange = (qId: string, optionIndex: number, value: string) => {
        setPassageQuestions(prev => prev.map(q => {
            if (q.id === qId) {
                const newOptions = [...q.options];
                newOptions[optionIndex] = value;
                return { ...q, options: newOptions };
            }
            return q;
        }));
    };

    const addPassageQuestion = () => {
        setPassageQuestions(prev => [...prev, { ...INITIAL_QUESTION, id: crypto.randomUUID() }]);
    };

    const removePassageQuestion = (qId: string) => {
        setPassageQuestions(prev => prev.filter(q => q.id !== qId));
    };

    const submitSingleQuestion = async () => {
        if (!singleQuestion.question_text || singleQuestion.options.some(o => !o)) {
            toast.error('Please fill in all fields');
            return;
        }

        setIsSubmitting(true);
        try {
            const { success, error } = await createManualQuestion({
                question_text: singleQuestion.question_text,
                options: singleQuestion.options,
                correct_answer: singleQuestion.correct_answer,
                explanation: singleQuestion.explanation,
                topic: singleQuestion.topic,
                subtopic: singleQuestion.subtopic,
                difficulty: singleQuestion.difficulty,
            });

            if (!success) throw error;

            toast.success('Question added successfully');
            setSingleQuestion({ ...INITIAL_QUESTION, id: crypto.randomUUID() });
            onQuestionAdded?.();
        } catch (error: any) {
            toast.error(`Error adding question: ${error.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const submitPassageGroup = async () => {
        if (!passageContent) {
            toast.error('Please enter passage content');
            return;
        }
        if (passageQuestions.some(q => !q.question_text || q.options.some(o => !o))) {
            toast.error('Please fill in all question fields');
            return;
        }

        setIsSubmitting(true);
        try {
            // 1. Insert Passage
            const { success: passageSuccess, passageId, error: passageError } = await createPassage(passageContent);

            if (!passageSuccess) throw passageError;

            // 2. Insert Questions linked to Passage
            for (const q of passageQuestions) {
                const { success, error } = await createManualQuestion({
                    question_text: q.question_text,
                    options: q.options,
                    correct_answer: q.correct_answer,
                    explanation: q.explanation,
                    topic: q.topic,
                    subtopic: q.subtopic,
                    difficulty: q.difficulty,
                    passage_id: passageId,
                });

                if (!success) throw error;
            }

            toast.success('Passage and questions added successfully');
            setPassageContent('');
            setPassageQuestions([{ ...INITIAL_QUESTION, id: crypto.randomUUID() }]);
            onQuestionAdded?.();
        } catch (error: any) {
            console.error(error);
            toast.error(`Error adding group: ${error.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Manual Question Entry</CardTitle>
            </CardHeader>
            <CardContent>
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="single">Single Question</TabsTrigger>
                        <TabsTrigger value="passage">Reading Comprehension</TabsTrigger>
                    </TabsList>

                    <TabsContent value="single" className="space-y-4 pt-4">
                        <QuestionFormFields
                            question={singleQuestion}
                            onChange={handleSingleQuestionChange}
                            onOptionChange={handleOptionChange}
                        />
                        <Button onClick={submitSingleQuestion} disabled={isSubmitting} className="w-full">
                            {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2 h-4 w-4" />}
                            Save Question
                        </Button>
                    </TabsContent>

                    <TabsContent value="passage" className="space-y-6 pt-4">
                        <div className="space-y-2">
                            <Label>Passage Content</Label>
                            <Textarea
                                placeholder="Paste reading passage here..."
                                className="min-h-[200px]"
                                value={passageContent}
                                onChange={(e) => setPassageContent(e.target.value)}
                            />
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-semibold">Questions ({passageQuestions.length})</h3>
                                <Button variant="outline" size="sm" onClick={addPassageQuestion}>
                                    <Plus className="mr-2 h-4 w-4" /> Add Question
                                </Button>
                            </div>

                            {passageQuestions.map((q, idx) => (
                                <Card key={q.id}>
                                    <CardContent className="pt-6 relative">
                                        {passageQuestions.length > 1 && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="absolute top-2 right-2 text-red-500"
                                                onClick={() => removePassageQuestion(q.id)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        )}
                                        <div className="mb-4 font-medium text-sm text-muted-foreground">Question {idx + 1}</div>
                                        <QuestionFormFields
                                            question={q}
                                            onChange={(field, val) => handlePassageQuestionChange(q.id, field, val)}
                                            onOptionChange={(optIdx, val) => handlePassageOptionChange(q.id, optIdx, val)}
                                        />
                                    </CardContent>
                                </Card>
                            ))}
                        </div>

                        <Button onClick={submitPassageGroup} disabled={isSubmitting} className="w-full">
                            {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2 h-4 w-4" />}
                            Save Passage & Questions
                        </Button>
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    );
}

function QuestionFormFields({
    question,
    onChange,
    onOptionChange
}: {
    question: QuestionForm;
    onChange: (field: keyof QuestionForm, value: any) => void;
    onOptionChange: (index: number, value: string) => void;
}) {
    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Topic</Label>
                    <Input
                        value={question.topic}
                        onChange={(e) => onChange('topic', e.target.value)}
                        placeholder="e.g. Mathematics"
                    />
                </div>
                <div className="space-y-2">
                    <Label>Subtopic</Label>
                    <Input
                        value={question.subtopic}
                        onChange={(e) => onChange('subtopic', e.target.value)}
                        placeholder="e.g. Algebra"
                    />
                </div>
            </div>

            <div className="space-y-2">
                <Label>Question Text</Label>
                <Textarea
                    value={question.question_text}
                    onChange={(e) => onChange('question_text', e.target.value)}
                    placeholder="Enter question text..."
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                {question.options.map((opt, idx) => (
                    <div key={idx} className="space-y-2">
                        <Label>Option {idx + 1}</Label>
                        <Input
                            value={opt}
                            onChange={(e) => onOptionChange(idx, e.target.value)}
                            placeholder={`Option ${idx + 1}`}
                        />
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Correct Answer</Label>
                    <Select
                        value={question.correct_answer}
                        onValueChange={(val) => onChange('correct_answer', val)}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Select correct option" />
                        </SelectTrigger>
                        <SelectContent>
                            {question.options.map((_, idx) => (
                                <SelectItem key={idx} value={idx.toString()}>Option {idx + 1}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label>Difficulty</Label>
                    <Select
                        value={question.difficulty}
                        onValueChange={(val) => onChange('difficulty', val)}
                    >
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Easy">Easy</SelectItem>
                            <SelectItem value="Medium">Medium</SelectItem>
                            <SelectItem value="Hard">Hard</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="space-y-2">
                <Label>Explanation</Label>
                <Textarea
                    value={question.explanation}
                    onChange={(e) => onChange('explanation', e.target.value)}
                    placeholder="Explain why the answer is correct..."
                />
            </div>
        </div>
    );
}
