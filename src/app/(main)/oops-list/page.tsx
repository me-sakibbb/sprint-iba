"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useMistakes, MistakeFilters } from "@/hooks/useMistakes";
import MistakeCard from "@/components/mistakes/MistakeCard";
import MistakeAnalyticsPanel from "@/components/mistakes/MistakeAnalytics";
import MistakeFiltersPanel from "@/components/mistakes/MistakeFilters";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
    Brain,
    AlertCircle,
    Loader2,
    Filter,
    ChevronLeft,
    ChevronRight,
    Play
} from "lucide-react";

export default function OopsListPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const {
        loading,
        error,
        mistakes,
        analytics,
        fetchMistakes,
        fetchAnalytics
    } = useMistakes();

    const [filters, setFilters] = useState<MistakeFilters>({});
    const [showFilters, setShowFilters] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    useEffect(() => {
        if (!authLoading && !user) {
            router.push("/auth");
        }
    }, [user, authLoading, router]);

    useEffect(() => {
        if (user) {
            fetchMistakes(filters);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filters, user]);

    // Get available topics from mistakes
    const availableTopics = Array.from(
        new Set(mistakes.map(m => m.topic).filter(Boolean) as string[])
    ).sort();

    // Pagination
    const totalPages = Math.ceil(mistakes.length / itemsPerPage);
    const paginatedMistakes = mistakes.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    if (authLoading) {
        return (
            <div className="container mx-auto px-6 py-8 max-w-7xl">
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-6 py-8 max-w-7xl">
            {/* Header */}
            <div className="mb-8 animate-fade-in">
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
                        <Brain className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                        <h1 className="text-3xl font-bold">Oops List</h1>
                        <p className="text-muted-foreground">
                            Track and learn from your mistakes
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        {mistakes.length > 0 && (
                            <Button
                                onClick={() => router.push('/practice?mode=mistakes')}
                                className="gradient-primary"
                            >
                                <Play className="w-4 h-4 mr-2" />
                                Practice Mistakes
                            </Button>
                        )}
                        <Button
                            variant={showFilters ? "default" : "outline"}
                            onClick={() => setShowFilters(!showFilters)}
                            className="lg:hidden"
                        >
                            <Filter className="w-4 h-4 mr-2" />
                            Filters
                        </Button>
                    </div>
                </div>
            </div>

            {/* Analytics */}
            {analytics && (
                <div className="mb-8">
                    <MistakeAnalyticsPanel analytics={analytics} loading={loading} />
                </div>
            )}

            {/* Error State */}
            {error && (
                <Card className="border-destructive bg-destructive/10 mb-6">
                    <CardContent className="p-4 flex items-center gap-3">
                        <AlertCircle className="w-5 h-5 text-destructive" />
                        <span className="text-destructive">{error}</span>
                    </CardContent>
                </Card>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Filters Sidebar */}
                <div className={`lg:block ${showFilters ? 'block' : 'hidden'}`}>
                    <MistakeFiltersPanel
                        topics={availableTopics}
                        onFiltersChange={setFilters}
                    />
                </div>

                {/* Mistakes List */}
                <div className="lg:col-span-3 relative">
                    {loading && (
                        <div className="absolute inset-0 bg-background/50 backdrop-blur-[1px] z-10 flex items-start justify-center pt-20">
                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
                        </div>
                    )}
                    <div className={loading ? 'opacity-50 pointer-events-none' : ''}>
                        {paginatedMistakes.length === 0 ? (
                            <Card className="border-border/40">
                                <CardContent className="p-12 text-center">
                                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                                        <Brain className="w-8 h-8 text-primary" />
                                    </div>
                                    <h3 className="text-lg font-semibold mb-2">
                                        {mistakes.length === 0 ? 'No Mistakes Yet!' : 'No Mistakes Found'}
                                    </h3>
                                    <p className="text-muted-foreground mb-4">
                                        {mistakes.length === 0
                                            ? "You haven't made any mistakes yet. Keep practicing to learn more!"
                                            : "Try adjusting your filters to see more mistakes."}
                                    </p>
                                    {mistakes.length === 0 && (
                                        <Button
                                            onClick={() => router.push('/practice?mode=mistakes')}
                                            className="gradient-primary"
                                        >
                                            Start Practicing Mistakes
                                        </Button>
                                    )}
                                </CardContent>
                            </Card>
                        ) : (
                            <>
                                {/* Mistakes Count */}
                                <div className="mb-4 flex items-center justify-between">
                                    <p className="text-sm text-muted-foreground">
                                        Showing {paginatedMistakes.length} of {mistakes.length} mistakes
                                    </p>
                                </div>

                                {/* Mistake Cards */}
                                <div className="space-y-4">
                                    {paginatedMistakes.map(mistake => (
                                        <MistakeCard key={mistake.id} mistake={mistake} />
                                    ))}
                                </div>

                                {/* Pagination */}
                                {totalPages > 1 && (
                                    <div className="flex items-center justify-center gap-2 mt-8">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                            disabled={currentPage === 1}
                                        >
                                            <ChevronLeft className="w-4 h-4" />
                                        </Button>

                                        <div className="flex items-center gap-1">
                                            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                                                <Button
                                                    key={page}
                                                    variant={page === currentPage ? "default" : "outline"}
                                                    size="sm"
                                                    onClick={() => setCurrentPage(page)}
                                                    className="w-9"
                                                >
                                                    {page}
                                                </Button>
                                            ))}
                                        </div>

                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                            disabled={currentPage === totalPages}
                                        >
                                            <ChevronRight className="w-4 h-4" />
                                        </Button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
