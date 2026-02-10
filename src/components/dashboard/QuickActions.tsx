"use client";

import { motion } from "framer-motion";
import {
    ClipboardList,
    FileText,
    Sparkles,
    BookOpen,
    Target,
    ArrowRight,
    Lock
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";

const actions = [
    {
        title: "Practice Mode",
        description: "Master topics at your own pace with adaptive questions.",
        icon: ClipboardList,
        href: "/practice",
        color: "text-blue-500",
        bgColor: "bg-blue-500/10",
        borderColor: "group-hover:border-blue-500/50",
        shadowColor: "group-hover:shadow-blue-500/20",
        comingSoon: false
    },
    {
        title: "Exams",
        description: "Take mock tests and live exams to simulate the real experience.",
        icon: FileText,
        href: "/exams",
        color: "text-purple-500",
        bgColor: "bg-purple-500/10",
        borderColor: "group-hover:border-purple-500/50",
        shadowColor: "group-hover:shadow-purple-500/20",
        comingSoon: false
    },
    {
        title: "VocabPoly",
        description: "Gamified vocabulary building to expand your word bank.",
        icon: Sparkles,
        href: "/vocabpoly",
        color: "text-indigo-500",
        bgColor: "bg-indigo-500/10",
        borderColor: "group-hover:border-indigo-500/50",
        shadowColor: "group-hover:shadow-indigo-500/20",
        comingSoon: false
    },
    {
        title: "Vocab Sprint",
        description: "Test your word power against the clock.",
        icon: BookOpen,
        href: "/game/vocab-sprint",
        color: "text-cyan-500",
        bgColor: "bg-cyan-500/10",
        borderColor: "group-hover:border-cyan-500/50",
        shadowColor: "group-hover:shadow-cyan-500/20",
        comingSoon: true
    },
    {
        title: "Math Sprint",
        description: "Sharpen your mental math skills with rapid-fire questions.",
        icon: Target,
        href: "/game/math-sprint",
        color: "text-orange-500",
        bgColor: "bg-orange-500/10",
        borderColor: "group-hover:border-orange-500/50",
        shadowColor: "group-hover:shadow-orange-500/20",
        comingSoon: true
    }
];

export default function QuickActions() {
    const router = useRouter();

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {actions.map((action, index) => (
                <motion.div
                    key={action.title}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    onClick={() => !action.comingSoon && router.push(action.href)}
                    className={`
                        group relative overflow-hidden rounded-2xl bg-card border border-border/50
                        p-6 transition-all duration-300
                        ${action.comingSoon ? "opacity-75 cursor-not-allowed" : `cursor-pointer hover:-translate-y-1 hover:shadow-lg ${action.shadowColor} ${action.borderColor}`}
                    `}
                >
                    <div className="absolute top-4 right-4">
                        {action.comingSoon && (
                            <Badge variant="secondary" className="gap-1 bg-muted/50">
                                <Lock className="w-3 h-3" /> Coming Soon
                            </Badge>
                        )}
                    </div>

                    <div className="flex flex-col h-full justify-between gap-4">
                        <div className="flex items-start justify-between">
                            <div className={`
                                p-3 rounded-xl ${action.bgColor} ${action.color}
                                transition-all duration-300 ${!action.comingSoon && "group-hover:scale-110"}
                            `}>
                                <action.icon className="w-6 h-6" />
                            </div>

                            {!action.comingSoon && (
                                <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform translate-x-2 group-hover:translate-x-0">
                                    <ArrowRight className={`w-5 h-5 ${action.color}`} />
                                </div>
                            )}
                        </div>

                        <div>
                            <h3 className={`text-xl font-bold mb-2 transition-colors ${!action.comingSoon ? "group-hover:text-primary" : ""}`}>
                                {action.title}
                            </h3>
                            <p className="text-muted-foreground text-sm leading-relaxed">
                                {action.description}
                            </p>
                        </div>
                    </div>
                </motion.div>
            ))}
        </div>
    );
}
