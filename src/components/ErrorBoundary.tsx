import React, { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-background p-4">
                    <div className="max-w-md w-full bg-card border border-border rounded-xl p-6 shadow-lg space-y-4">
                        <h2 className="text-2xl font-bold text-red-500">Something went wrong</h2>
                        <div className="bg-muted/50 p-4 rounded-lg overflow-auto max-h-48 text-sm font-mono text-muted-foreground">
                            {this.state.error?.message}
                        </div>
                        <div className="flex gap-2">
                            <Button onClick={() => window.location.reload()} variant="outline" className="w-full">
                                Reload Page
                            </Button>
                            <Button onClick={() => window.history.back()} className="w-full">
                                Go Back
                            </Button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
