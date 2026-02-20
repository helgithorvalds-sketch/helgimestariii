import { useState, useRef, useEffect } from "react";
import { Company } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import { updateCompany } from "@/services/companyService";
import { addCallLog } from "@/services/callLogService";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Bot, Mic, MicOff, Send, X, ChevronDown, Loader2, Sparkles } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  text: string;
}

interface AIAction {
  type: "add_note" | "update_price" | "update_stage" | "schedule_call" | "update_owner" | "update_phone";
  companyId: string;
  note?: string;
  price?: number;
  stage?: string;
  nextCallAt?: string;
  owner?: string;
  phone?: string;
}

interface AIAssistantProps {
  companies: Company[];
  onCompaniesChange: (updater: (prev: Company[]) => Company[]) => void;
}

export function AIAssistant({ companies, onCompaniesChange }: AIAssistantProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", text: "Hæ! Ég er aðstoðarmaðurinn þinn. Þú getur sagt mér að bæta við athugasemdum, breyta verði, skipuleggja símtöl, og fleira. Talaðu eða skrifaðu á ensku!" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const executeActions = async (actions: AIAction[]) => {
    for (const action of actions) {
      const company = companies.find((c) => c.id === action.companyId);
      if (!company) continue;

      if (action.type === "add_note") {
        await addCallLog(company.id, action.note || "");
      } else if (action.type === "update_price") {
        const updated = { ...company, estimatedPrice: action.price! };
        const result = await updateCompany(updated);
        if (result) {
          onCompaniesChange((prev) => prev.map((c) => c.id === result.id ? result : c));
        }
      } else if (action.type === "update_stage") {
        const updated = { ...company, stage: action.stage as Company["stage"] };
        const result = await updateCompany(updated);
        if (result) {
          onCompaniesChange((prev) => prev.map((c) => c.id === result.id ? result : c));
        }
      } else if (action.type === "schedule_call") {
        const updated = { ...company, nextCallAt: action.nextCallAt };
        const result = await updateCompany(updated);
        if (result) {
          onCompaniesChange((prev) => prev.map((c) => c.id === result.id ? result : c));
        }
      } else if (action.type === "update_owner") {
        const updated = { ...company, owner: action.owner || "" };
        const result = await updateCompany(updated);
        if (result) {
          onCompaniesChange((prev) => prev.map((c) => c.id === result.id ? result : c));
        }
      } else if (action.type === "update_phone") {
        const updated = { ...company, phone: action.phone };
        const result = await updateCompany(updated);
        if (result) {
          onCompaniesChange((prev) => prev.map((c) => c.id === result.id ? result : c));
        }
      }
    }
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: Message = { role: "user", text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const companySummary = companies.map((c) => ({
        id: c.id,
        name: c.name,
        stage: c.stage,
        estimatedPrice: c.estimatedPrice,
        nextCallAt: c.nextCallAt,
      }));

      const { data, error } = await supabase.functions.invoke("ai-assistant", {
        body: { message: text, companies: companySummary },
      });

      if (error) throw error;

      if (data?.reply) {
        setMessages((prev) => [...prev, { role: "assistant", text: data.reply }]);
      }

      if (data?.actions && data.actions.length > 0) {
        await executeActions(data.actions);
        toast.success(`${data.actions.length} aðgerð${data.actions.length > 1 ? "ir" : ""} framkvæmdar`);
      }
    } catch (e: any) {
      console.error("AI assistant error:", e);
      setMessages((prev) => [...prev, { role: "assistant", text: "Eitthvað fór úrskeiðis. Reyndu aftur!" }]);
      toast.error("Villa í AI aðstoðarmanni");
    }
    setLoading(false);
  };

  const handleVoiceInput = () => {
    const SpeechRecognitionAPI =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      toast.error("Vafrinn þinn styður ekki talgreiningu");
      return;
    }
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      return;
    }
    const recognition = new SpeechRecognitionAPI();
    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((r: any) => r[0].transcript)
        .join(" ");
      sendMessage(transcript);
    };
    recognition.onend = () => setIsRecording(false);
    recognition.onerror = () => {
      setIsRecording(false);
      toast.error("Villa við talgreiningu");
    };
    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
  };

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center justify-center group"
          title="AI Aðstoðarmaður"
        >
          <Bot className="w-6 h-6" />
          <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-green-500 border-2 border-background animate-pulse" />
        </button>
      )}

      {/* Panel */}
      {open && (
        <div className="fixed bottom-6 right-6 z-50 w-[380px] max-w-[calc(100vw-2rem)] rounded-2xl border-2 border-primary/20 bg-card shadow-2xl flex flex-col overflow-hidden"
          style={{ height: "520px" }}>
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 bg-primary text-primary-foreground flex-shrink-0">
            <div className="w-8 h-8 rounded-full bg-primary-foreground/20 flex items-center justify-center">
              <Bot className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-sm">AI Aðstoðarmaður</p>
              <p className="text-xs opacity-70">Talaðu á ensku · {companies.length} fyrirtæki</p>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="w-7 h-7 rounded-full hover:bg-primary-foreground/20 flex items-center justify-center transition-colors"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                {msg.role === "assistant" && (
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mr-2 mt-0.5">
                    <Sparkles className="w-3.5 h-3.5 text-primary" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "bg-muted text-foreground rounded-bl-sm"
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mr-2 mt-0.5">
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                </div>
                <div className="bg-muted rounded-2xl rounded-bl-sm px-4 py-3">
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="flex-shrink-0 border-t p-3 bg-background/50 backdrop-blur-sm">
            {isRecording && (
              <div className="flex items-center gap-2 mb-2 px-1">
                <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
                <p className="text-xs text-destructive font-medium">Hlusta... (talaðu á ensku)</p>
              </div>
            )}
            <div className="flex gap-2 items-end">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage(input);
                  }
                }}
                placeholder="Skrifaðu eða talaðu á ensku..."
                rows={2}
                className="flex-1 text-sm resize-none min-h-0"
                disabled={loading}
              />
              <div className="flex flex-col gap-1.5">
                <Button
                  size="icon"
                  variant={isRecording ? "destructive" : "outline"}
                  onClick={handleVoiceInput}
                  className="w-9 h-9 flex-shrink-0"
                  title={isRecording ? "Stöðva" : "Tala"}
                >
                  {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </Button>
                <Button
                  size="icon"
                  onClick={() => sendMessage(input)}
                  disabled={!input.trim() || loading}
                  className="w-9 h-9 flex-shrink-0"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground mt-2 px-1">
              Dæmi: "Add a note for [company] that they want a redesign" · "Change [company] price to 300000" · "Schedule a call with [company] tomorrow at 10am"
            </p>
          </div>
        </div>
      )}
    </>
  );
}
