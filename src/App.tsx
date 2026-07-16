import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import FinancesWrapper from "./pages/FinancesWrapper";
import Tasks from "./pages/Tasks";
import Leads from "./pages/Leads";
import NotFound from "./pages/NotFound";
import Dagurinn from "./pages/Dagurinn";
import { AuroraBackground } from "./components/molten/AuroraBackground";
import { MobileNav } from "./components/MobileNav";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuroraBackground />
        <Routes>
          <Route path="/" element={<Dagurinn />} />
          <Route path="/kanban" element={<Index />} />
          <Route path="/finances" element={<FinancesWrapper />} />
          <Route path="/tasks" element={<Tasks />} />
          <Route path="/leads" element={<Leads />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        <MobileNav />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
