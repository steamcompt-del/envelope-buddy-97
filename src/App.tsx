import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/contexts/AuthContext";
import { BudgetProvider } from "@/contexts/BudgetContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ProtectedLayout } from "@/components/ProtectedLayout";
import Index from "./pages/Index";
import Planning from "./pages/Planning";
import Expenses from "./pages/Expenses";
import Shopping from "./pages/Shopping";
import Settings from "./pages/Settings";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <ProtectedLayout>
                      <BudgetProvider key="index">
                        <Index />
                      </BudgetProvider>
                    </ProtectedLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/expenses"
                element={
                  <ProtectedRoute>
                    <ProtectedLayout>
                      <BudgetProvider key="expenses">
                        <Expenses />
                      </BudgetProvider>
                    </ProtectedLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/planning"
                element={
                  <ProtectedRoute>
                    <ProtectedLayout>
                      <BudgetProvider key="planning">
                        <Planning />
                      </BudgetProvider>
                    </ProtectedLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/shopping"
                element={
                  <ProtectedRoute>
                    <ProtectedLayout>
                      <BudgetProvider key="shopping">
                        <Shopping />
                      </BudgetProvider>
                    </ProtectedLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/settings"
                element={
                  <ProtectedRoute>
                    <ProtectedLayout>
                      <BudgetProvider key="settings">
                        <Settings />
                      </BudgetProvider>
                    </ProtectedLayout>
                  </ProtectedRoute>
                }
              />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
