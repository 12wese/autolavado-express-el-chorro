import { Toaster } from "@/presentation/ui/toaster";
import { Toaster as Sonner } from "@/presentation/ui/sonner";
import { TooltipProvider } from "@/presentation/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./presentation/pages/Index";
import Auth from "./presentation/pages/Auth";
import ResetPassword from "./presentation/pages/ResetPassword";
import Dashboard from "./presentation/pages/Dashboard";
import NotFound from "./presentation/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
