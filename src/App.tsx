import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import FinancesWrapper from "./pages/FinancesWrapper";
import Tasks from "./pages/Tasks";
import Leads from "./pages/Leads";
import Svif from "./pages/Svif";
import SvifFyrirtæki from "./pages/SvifFyrirtæki";
import SvifListi from "./pages/SvifListi";
import Fyrirtaekjabok from "./pages/Fyrirtaekjabok";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();


const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/finances" element={<FinancesWrapper />} />
          <Route path="/tasks" element={<Tasks />} />
          <Route path="/leads" element={<Leads />} />
          <Route path="/svif" element={<Svif />} />
          <Route path="/svif-fyrirtæki" element={<SvifFyrirtæki />} />
          <Route path="/svif-listi" element={<SvifListi />} />
          <Route path="/fyrirtaekjabok" element={<Fyrirtaekjabok />} />


          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
