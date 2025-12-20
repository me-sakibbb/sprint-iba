import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Community from "./pages/Community";
import Profile from "./pages/Profile";
import MathResources from "./pages/MathResources";
import EnglishResources from "./pages/EnglishResources";
import AnalyticalResources from "./pages/AnalyticalResources";
import PracticeSession from "./pages/PracticeSession";
import NotFound from "./pages/NotFound";
import ErrorBoundary from "@/components/ErrorBoundary";
import OperatorLogin from "./pages/operator/OperatorLogin";
import OperatorDashboard from "./pages/operator/OperatorDashboard";
import QuestionEditor from "./pages/operator/QuestionEditor";
import OperatorReports from "./pages/operator/OperatorReports";
import PublicProfile from "./pages/PublicProfile";
import Messages from "./pages/Messages";
import Groups from "./pages/Groups";
import Friends from "./pages/Friends";
import VocabGame from "./pages/VocabGame";
import VocabPoly from "./pages/VocabPoly";
import MathGame from "./pages/MathGame";
import Emulator from "./pages/Emulator";
import StudyPlan from "./pages/StudyPlan";
import { OperatorRoute } from "@/components/OperatorRoute";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/community"
              element={
                <ProtectedRoute>
                  <Community />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/resources/math"
              element={
                <ProtectedRoute>
                  <MathResources />
                </ProtectedRoute>
              }
            />
            <Route
              path="/resources/english"
              element={
                <ProtectedRoute>
                  <EnglishResources />
                </ProtectedRoute>
              }
            />
            <Route
              path="/resources/analytical"
              element={
                <ProtectedRoute>
                  <AnalyticalResources />
                </ProtectedRoute>
              }
            />


            <Route
              path="/practice/:subject/:unitId/:skillId"
              element={
                <ProtectedRoute>
                  <PracticeSession />
                </ProtectedRoute>
              }
            />
            <Route path="/profile/:userId" element={<PublicProfile />} />
            <Route
              path="/messages"
              element={
                <ProtectedRoute>
                  <Messages />
                </ProtectedRoute>
              }
            />
            <Route
              path="/groups"
              element={
                <ProtectedRoute>
                  <Groups />
                </ProtectedRoute>
              }
            />
            <Route
              path="/friends"
              element={
                <ProtectedRoute>
                  <Friends />
                </ProtectedRoute>
              }
            />
            <Route path="/operator/login" element={<OperatorLogin />} />
            <Route
              path="/operator/dashboard"
              element={
                <OperatorRoute>
                  <OperatorDashboard />
                </OperatorRoute>
              }
            />
            <Route
              path="/operator/editor/:id"
              element={
                <OperatorRoute>
                  <QuestionEditor />
                </OperatorRoute>
              }
            />
            <Route
              path="/operator/reports"
              element={
                <OperatorRoute>
                  <OperatorReports />
                </OperatorRoute>
              }
            />
            <Route
              path="/game"
              element={
                <ProtectedRoute>
                  <VocabGame />
                </ProtectedRoute>
              }
            />
            <Route
              path="/math-game"
              element={
                <ProtectedRoute>
                  <MathGame />
                </ProtectedRoute>
              }
            />
            <Route
              path="/emulator"
              element={
                <ProtectedRoute>
                  <Emulator />
                </ProtectedRoute>
              }
            />
            <Route
              path="/vocabpoly"
              element={
                <ProtectedRoute>
                  <VocabPoly />
                </ProtectedRoute>
              }
            />
            <Route
              path="/study-plan"
              element={
                <ProtectedRoute>
                  <StudyPlan />
                </ProtectedRoute>
              }
            />

            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
