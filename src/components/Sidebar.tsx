import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { BookOpen, Calculator, Languages, Brain, ChevronRight, ChevronLeft, LayoutDashboard, Users, Trophy, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate, useLocation } from "react-router-dom";

const Sidebar = () => {
    const [isOpen, setIsOpen] = useState(true);
    const navigate = useNavigate();
    const location = useLocation();

    return (
        <div
            className={cn(
                "hidden md:flex flex-col border-r border-border/40 bg-background/95 backdrop-blur-xl h-screen sticky top-0 left-0 transition-all duration-300",
                isOpen ? "w-64" : "w-20"
            )}
        >
            {/* Toggle Button */}
            <Button
                variant="ghost"
                size="icon"
                className="absolute -right-3 top-6 h-6 w-6 rounded-full border border-border bg-background shadow-md z-50"
                onClick={() => setIsOpen(!isOpen)}
            >
                {isOpen ? <ChevronLeft className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            </Button>

            {/* Navigation Links */}
            <div className="px-3 mt-16 space-y-1">
                {location.pathname !== '/dashboard' && (
                    <Button
                        variant="ghost"
                        className={cn("w-full justify-start text-muted-foreground hover:text-foreground", !isOpen && "justify-center px-0")}
                        onClick={() => navigate('/dashboard')}
                    >
                        <LayoutDashboard className={cn("w-4 h-4", isOpen && "mr-2")} />
                        {isOpen && "Dashboard"}
                    </Button>
                )}
                {location.pathname !== '/community' && (
                    <Button
                        variant="ghost"
                        className={cn("w-full justify-start text-muted-foreground hover:text-foreground", !isOpen && "justify-center px-0")}
                        onClick={() => navigate('/community')}
                    >
                        <Users className={cn("w-4 h-4", isOpen && "mr-2")} />
                        {isOpen && "Community"}
                    </Button>
                )}
                {/* Study Plan Link */}
                <Button
                    variant="ghost"
                    className={cn("w-full justify-start text-accent hover:text-accent/80", !isOpen && "justify-center px-0")}
                    onClick={() => navigate('/study-plan')}
                >
                    <Calendar className={cn("w-4 h-4", isOpen && "mr-2")} />
                    {isOpen && "Study Plan"}
                </Button>
                {/* Game Link */}
                <Button
                    variant="ghost"
                    className={cn("w-full justify-start text-emerald-500 hover:text-emerald-400 font-bold mt-2", !isOpen && "justify-center px-0")}
                    onClick={() => navigate('/game')}
                >
                    <Trophy className={cn("w-4 h-4", isOpen && "mr-2")} />
                    {isOpen && "VocabPoly"}
                </Button>
            </div>

            {/* Resources Section */}
            <div className="flex-1 p-4 overflow-hidden">
                {isOpen && (
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4 px-2 animate-fade-in">
                        Resources
                    </h4>
                )}
                <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="resources" className="border-none">
                        <AccordionTrigger className={cn("hover:no-underline py-2 px-2 rounded-lg hover:bg-accent/10 transition-colors", !isOpen && "justify-center")}>
                            <div className="flex items-center gap-2">
                                <BookOpen className="w-4 h-4 text-primary" />
                                {isOpen && <span>Study Materials</span>}
                            </div>
                        </AccordionTrigger>
                        {isOpen && (
                            <AccordionContent className="pt-1 pb-0 animate-fade-in">
                                <div className="flex flex-col space-y-1 ml-4 mt-1 border-l border-border/40 pl-2">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="justify-start font-normal h-8"
                                        onClick={() => navigate('/resources/math')}
                                    >
                                        <Calculator className="w-3 h-3 mr-2 text-blue-500" />
                                        Math
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="justify-start font-normal h-8"
                                        onClick={() => navigate('/resources/english')}
                                    >
                                        <Languages className="w-3 h-3 mr-2 text-green-500" />
                                        English
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="justify-start font-normal h-8"
                                        onClick={() => navigate('/resources/analytical')}
                                    >
                                        <Brain className="w-3 h-3 mr-2 text-purple-500" />
                                        Analytical
                                    </Button>
                                </div>
                            </AccordionContent>
                        )}
                    </AccordionItem>
                </Accordion>
            </div>
        </div>
    );
};

export default Sidebar;
