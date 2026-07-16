import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type SpeechRecognitionCtor = any;

function getSR(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null;
}

export interface UseVoiceDictation {
  supported: boolean;
  recording: boolean;
  interim: string;
  start: () => Promise<void>;
  stop: () => Promise<void>;
}

/**
 * Icelandic voice dictation.
 * Prefers Web Speech API (SpeechRecognition lang="is-IS") with live interim results.
 * Falls back to MediaRecorder + edge function transcription (transcribe-audio).
 * onFinal is called with each finalized segment (plain text, no trailing punctuation added).
 */
export function useVoiceDictation(onFinal: (text: string) => void, onInterim?: (text: string) => void): UseVoiceDictation {
  const SR = getSR();
  const supported = !!SR || (typeof navigator !== "undefined" && !!navigator.mediaDevices);
  const [recording, setRecording] = useState(false);
  const [interim, setInterim] = useState("");
  const recRef = useRef<any>(null);
  const mediaRecRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => () => {
    try { recRef.current?.stop(); } catch {}
    try { mediaRecRef.current?.stop(); } catch {}
    streamRef.current?.getTracks().forEach((t) => t.stop());
  }, []);

  useEffect(() => {
    if (onInterim) onInterim(interim);
  }, [interim, onInterim]);

  const startNative = useCallback(async () => {
    const rec = new SR();
    rec.lang = "is-IS";
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (e: any) => {
      let interimText = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        const txt: string = res[0]?.transcript || "";
        if (res.isFinal) {
          if (txt.trim()) onFinal(txt.trim());
        } else {
          interimText += txt;
        }
      }
      setInterim(interimText);
    };
    rec.onerror = () => {};
    rec.onend = () => {
      setRecording(false);
      setInterim("");
    };
    recRef.current = rec;
    rec.start();
    setRecording(true);
  }, [SR, onFinal]);

  const startFallback = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    streamRef.current = stream;
    const mime = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4";
    const mr = new MediaRecorder(stream, { mimeType: mime });
    chunksRef.current = [];
    mr.ondataavailable = (e) => { if (e.data.size) chunksRef.current.push(e.data); };
    mr.onstop = async () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      const blob = new Blob(chunksRef.current, { type: mime });
      if (blob.size < 1024) { setRecording(false); return; }
      try {
        const buf = await blob.arrayBuffer();
        let bin = "";
        const bytes = new Uint8Array(buf);
        for (let i = 0; i < bytes.byteLength; i++) bin += String.fromCharCode(bytes[i]);
        const b64 = btoa(bin);
        const { data, error } = await supabase.functions.invoke("transcribe-audio", {
          body: { audio: b64, mime },
        });
        if (!error && data?.text) onFinal(String(data.text).trim());
      } catch (e) {
        console.error("transcribe fallback failed", e);
      }
      setRecording(false);
      setInterim("");
    };
    mediaRecRef.current = mr;
    mr.start();
    setRecording(true);
  }, [onFinal]);

  const start = useCallback(async () => {
    if (recording) return;
    try {
      if (SR) await startNative();
      else await startFallback();
    } catch (e) {
      console.error("voice start failed", e);
      setRecording(false);
    }
  }, [SR, recording, startNative, startFallback]);

  const stop = useCallback(async () => {
    try { recRef.current?.stop(); } catch {}
    try { mediaRecRef.current?.stop(); } catch {}
  }, []);

  return { supported, recording, interim, start, stop };
}