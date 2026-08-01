import { useCallback, useEffect, useRef, useState } from "react";

/* ------------------------------------------------------------------ */
/* Minimal Web Speech API typings (not in the default TS lib)          */
/* ------------------------------------------------------------------ */
interface SpeechRecognitionResultLike {
  0: { transcript: string };
  isFinal: boolean;
}
interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: { length: number; [i: number]: SpeechRecognitionResultLike };
}
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/* ------------------------------------------------------------------ */
/* Text-to-Speech                                                      */
/* ------------------------------------------------------------------ */
export function useTextToSpeech() {
  // Deteksi dukungan harus jalan setelah hydration (SSR tidak punya window),
  // kalau tidak tombol TTS akan hilang selamanya di klien.
  const [supported, setSupported] = useState(false);
  useEffect(() => {
    setSupported("speechSynthesis" in window);
  }, []);
  const [speaking, setSpeaking] = useState(false);


  const cancel = useCallback(() => {
    if (!supported) return;
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }, [supported]);

  const speak = useCallback(
    (text: string) => {
      if (!supported || !text.trim()) return;
      window.speechSynthesis.cancel();
      // Pecah teks panjang agar tidak terpotong pada sebagian browser.
      const chunks = text.match(/[^.!?\n]+[.!?\n]*/g) ?? [text];
      let i = 0;
      const speakNext = () => {
        if (i >= chunks.length) {
          setSpeaking(false);
          return;
        }
        const u = new SpeechSynthesisUtterance(chunks[i].trim());
        u.lang = "id-ID";
        u.rate = 1;
        u.onend = () => {
          i += 1;
          speakNext();
        };
        u.onerror = () => setSpeaking(false);
        window.speechSynthesis.speak(u);
      };
      setSpeaking(true);
      speakNext();
    },
    [supported],
  );

  useEffect(() => () => {
    if (supported) window.speechSynthesis.cancel();
  }, [supported]);

  return { supported, speaking, speak, cancel };
}

/* ------------------------------------------------------------------ */
/* Speech-to-Text                                                      */
/* ------------------------------------------------------------------ */
export function useSpeechToText(onFinal?: (text: string) => void) {
  const [supported, setSupported] = useState(false);
  useEffect(() => {
    setSupported(getRecognitionCtor() !== null);
  }, []);

  const [listening, setListening] = useState(false);
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const finalCb = useRef(onFinal);
  finalCb.current = onFinal;

  const stop = useCallback(() => {
    recRef.current?.stop();
    setListening(false);
  }, []);

  const start = useCallback(() => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) return;
    const rec = new Ctor();
    rec.lang = "id-ID";
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalCb.current?.(r[0].transcript.trim());
      }
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recRef.current = rec;
    rec.start();
    setListening(true);
  }, []);

  useEffect(() => () => recRef.current?.abort(), []);

  return { supported, listening, start, stop };
}

/* ------------------------------------------------------------------ */
/* Insert dictated text into the currently focused input/textarea      */
/* (works with React-controlled inputs via the native value setter)    */
/* ------------------------------------------------------------------ */
export function insertTextIntoActiveElement(text: string) {
  const el = document.activeElement as HTMLInputElement | HTMLTextAreaElement | null;
  if (!el || (el.tagName !== "INPUT" && el.tagName !== "TEXTAREA")) return false;
  const proto =
    el.tagName === "TEXTAREA"
      ? window.HTMLTextAreaElement.prototype
      : window.HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
  const next = (el.value ? el.value + " " : "") + text;
  if (setter) setter.call(el, next);
  else el.value = next;
  el.dispatchEvent(new Event("input", { bubbles: true }));
  return true;
}
