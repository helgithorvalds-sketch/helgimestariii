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
import SvifAkureyri from "./pages/SvifAkureyri";
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
          <Route path="/svif-akureyri" element={<SvifAkureyri />} />
          <Route
            path="/svif-akureyri-v2"
            element={<SvifAkureyri source="svif_akureyri_v2" title="Svif Akureyri v2" subtitle="Viðbót 15.9.2026 – iðnaðarmenn, þjónusta og verslanir" />}
          />
          <Route
            path="/svif-akureyri-v3"
            element={<SvifAkureyri source="svif_akureyri_v3" title="Svif Akureyri v3" subtitle="Meistarafélög – félagar í Samtökum iðnaðarins, MBN og SART" />}
          />
          <Route
            path="/svif-badi-svaedi"
            element={<SvifAkureyri bothRegions title="Svif – bæði svæði" subtitle="Keðjur og fyrirtæki með starfsstöð bæði á höfuðborgarsvæðinu og á Akureyri" />}
          />
          <Route
            path="/svif-akureyri-v4"
            element={<SvifAkureyri source="svif_akureyri_v4" title="Svif Akureyri v4" subtitle="Tengingar – fyrirtæki með óbeina tengingu við nýja húseigendur, rök í glósum" />}
          />
          <Route path="/fyrirtaekjabok" element={<Fyrirtaekjabok />} />


          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
