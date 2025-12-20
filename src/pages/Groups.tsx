import Sidebar from "@/components/Sidebar";
import { Card, CardContent } from "@/components/ui/card";

const Groups = () => {
    return (
        <div className="min-h-screen bg-background flex">
            <Sidebar />
            <div className="flex-1 flex flex-col min-w-0 p-8">
                <h1 className="text-3xl font-bold mb-8">Groups</h1>
                <Card className="border-border/40">
                    <CardContent className="p-8 text-center text-muted-foreground">
                        Group creation feature coming soon!
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default Groups;
