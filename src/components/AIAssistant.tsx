import { useState, useRef, useEffect } from "react";
import { Company } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import { updateCompany } from "@/services/companyService";
import { addCallLog } from "@/services/callLogService";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Mic, MicOff, Send, ChevronDown, Loader2, Sparkles, Bot } from "lucide-react";

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
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (open) {
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [open]);

  const executeActions = async (actions: AIAction[]) => {
    for (const action of actions) {
      const company = companies.find((c) => c.id === action.companyId);
      if (!company) continue;
      if (action.type === "add_note") {
        await addCallLog(company.id, action.note || "");
      } else if (action.type === "update_price") {
        const updated = { ...company, estimatedPrice: action.price! };
        const result = await updateCompany(updated);
        if (result) onCompaniesChange((prev) => prev.map((c) => c.id === result.id ? result : c));
      } else if (action.type === "update_stage") {
        const updated = { ...company, stage: action.stage as Company["stage"] };
        const result = await updateCompany(updated);
        if (result) onCompaniesChange((prev) => prev.map((c) => c.id === result.id ? result : c));
      } else if (action.type === "schedule_call") {
        const updated = { ...company, nextCallAt: action.nextCallAt };
        const result = await updateCompany(updated);
        if (result) onCompaniesChange((prev) => prev.map((c) => c.id === result.id ? result : c));
      } else if (action.type === "update_owner") {
        const updated = { ...company, owner: action.owner || "" };
        const result = await updateCompany(updated);
        if (result) onCompaniesChange((prev) => prev.map((c) => c.id === result.id ? result : c));
      } else if (action.type === "update_phone") {
        const updated = { ...company, phone: action.phone };
        const result = await updateCompany(updated);
        if (result) onCompaniesChange((prev) => prev.map((c) => c.id === result.id ? result : c));
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
        id: c.id, name: c.name, stage: c.stage,
        estimatedPrice: c.estimatedPrice, nextCallAt: c.nextCallAt,
      }));
      const { data, error } = await supabase.functions.invoke("ai-assistant", {
        body: { message: text, companies: companySummary },
      });
      if (error) throw error;
      if (data?.reply) {
        setMessages((prev) => [...prev, { role: "assistant", text: data.reply }]);
      }
      if (data?.actions?.length > 0) {
        await executeActions(data.actions);
        toast.success(`${data.actions.length} aðgerð${data.actions.length > 1 ? "ir" : ""} framkvæmdar`);
      }
    } catch (e) {
      setMessages((prev) => [...prev, { role: "assistant", text: "Eitthvað fór úrskeiðis. Reyndu aftur!" }]);
      toast.error("Villa í AI aðstoðarmanni");
    }
    setLoading(false);
  };

  const isListeningRef = useRef(false);

  const handleVoiceInput = () => {
    const SpeechRecognitionAPI =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) { toast.error("Vafrinn þinn styður ekki talgreiningu"); return; }

    // Stop if already recording
    if (isRecording) {
      isListeningRef.current = false;
      recognitionRef.current?.stop();
      setIsRecording(false);
      return;
    }

    // Clean up any previous instance
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (_) {}
      recognitionRef.current = null;
    }

    const recognition = new SpeechRecognitionAPI();
    recognition.lang = "en-US";
    recognition.continuous = true;
    recognition.interimResults = true;

    let finalTranscript = "";

    recognition.onresult = (event: any) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript + " ";
        } else {
          interim += result[0].transcript;
        }
      }
      // Show interim in input field
      setInput(finalTranscript + interim);
    };

    recognition.onend = () => {
      if (isListeningRef.current) {
        // Auto-restart on silence timeout
        try { recognition.start(); } catch (_) {}
      } else {
        setIsRecording(false);
        // Send the final transcript
        if (finalTranscript.trim()) {
          sendMessage(finalTranscript.trim());
          setInput("");
        }
      }
    };

    recognition.onerror = (event: any) => {
      if (event.error === "not-allowed") {
        toast.error("Hljóðnemi ekki leyfður. Athugaðu stillingar vafrans.");
        isListeningRef.current = false;
        setIsRecording(false);
      } else if (event.error === "no-speech") {
        // Normal silence timeout, will auto-restart via onend
      } else {
        console.error("Speech recognition error:", event.error);
        isListeningRef.current = false;
        setIsRecording(false);
      }
    };

    recognitionRef.current = recognition;
    isListeningRef.current = true;
    recognition.start();
    setIsRecording(true);
  };

  return (
    <div className="fixed bottom-0 left-0 z-50 flex flex-col" style={{ width: open ? 360 : "auto" }}>
      {/* Expanded panel */}
      {open && (
        <div className="flex flex-col bg-card border border-border border-b-0 rounded-tr-2xl shadow-2xl overflow-hidden"
          style={{ height: 520 }}>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 pt-4 pb-2 space-y-3">
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                {msg.role === "assistant" && (
                  <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Sparkles className="w-3 h-3 text-primary-foreground" />
                  </div>
                )}
                <div className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground rounded-br-none ml-auto"
                    : "bg-muted text-foreground rounded-bl-none"
                }`}>
                  {msg.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex gap-2">
                <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Sparkles className="w-3 h-3 text-primary-foreground" />
                </div>
                <div className="bg-muted rounded-2xl rounded-bl-none px-4 py-3 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input area */}
          <div className="border-t border-border p-3 bg-background/60 backdrop-blur-sm space-y-2">
            {isRecording && (
              <div className="flex items-center gap-2 px-1">
                <span className="w-2 h-2 rounded-full bg-destructive animate-pulse flex-shrink-0" />
                <p className="text-xs text-destructive font-medium">Hlusta... (talaðu á ensku)</p>
              </div>
            )}
            <div className="flex gap-2 items-end">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
                }}
                placeholder="Skrifaðu eða talaðu á ensku..."
                rows={2}
                className="flex-1 text-sm resize-none min-h-0 border-0 bg-muted/50 focus-visible:ring-1 rounded-xl"
                disabled={loading}
              />
              <div className="flex flex-col gap-1.5">
                <Button size="icon"
                  variant={isRecording ? "destructive" : "ghost"}
                  onClick={handleVoiceInput}
                  className="w-8 h-8 rounded-xl flex-shrink-0"
                  title={isRecording ? "Stöðva og senda" : "Tala"}
                >
                  {isRecording ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                </Button>
                <Button size="icon"
                  onClick={() => sendMessage(input)}
                  disabled={!input.trim() || loading}
                  className="w-8 h-8 rounded-xl flex-shrink-0"
                >
                  <Send className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab / trigger */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium transition-all
          ${open
            ? "bg-primary text-primary-foreground w-full justify-between"
            : "bg-card border border-border border-b-0 rounded-tr-xl text-foreground hover:bg-muted shadow-lg"
          }`}
      >
        <div className="flex items-center gap-2">
          <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${open ? "bg-primary-foreground/20" : "bg-primary"}`}>
            <Bot className={`w-3 h-3 ${open ? "text-primary-foreground" : "text-primary-foreground"}`} />
          </div>
          <span>AI Aðstoðarmaður</span>
          {!open && (
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          )}
        </div>
        {open && <ChevronDown className="w-4 h-4 opacity-70" />}
      </button>
    </div>
  );
}
