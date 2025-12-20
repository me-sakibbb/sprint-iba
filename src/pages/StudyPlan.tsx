import Sidebar from "@/components/Sidebar";
import Navigation from "@/components/Navigation";
import AIStudyPlanner from "@/components/AIStudyPlanner";

const StudyPlan = () => {
    return (
        <div className="min-h-screen bg-background flex">
            <Sidebar />
            <div className="flex-1 flex flex-col">
                <Navigation />
                <main className="flex-1 p-6">
                    <div className="max-w-7xl mx-auto">
                        <AIStudyPlanner />
                    </div>
                </main>
            </div>
        </div>
    );
};

export default StudyPlan;
