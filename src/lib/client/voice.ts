"use client";
// Speak (speech to text) and Listen (read aloud), in the language chosen in Profile.
// When the phone can't do it, the app says so; it never pretends.

type Rec = {
  lang: string; continuous: boolean; interimResults: boolean;
  onresult: ((e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void; stop: () => void; abort: () => void;
};

export function canSpeak() {
  if (typeof window === "undefined") return false;
  const w = window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown };
  return !!(w.SpeechRecognition || w.webkitSpeechRecognition);
}

export function listenTo(lang: string, onText: (finalText: string, interim: string) => void, onStop: (problem: string | null) => void) {
  const w = window as unknown as { SpeechRecognition?: new () => Rec; webkitSpeechRecognition?: new () => Rec };
  const C = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  if (!C) { onStop("Voice typing isn't available on this phone. Use the keyboard's microphone key instead."); return () => {}; }
  const r = new C();
  r.lang = lang || "en-IN";
  r.continuous = true;
  r.interimResults = true;
  let problem: string | null = null;
  r.onresult = (e) => {
    let fin = "", mid = "";
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const res = e.results[i];
      if (res.isFinal) fin += res[0].transcript; else mid += res[0].transcript;
    }
    onText(fin, mid);
  };
  r.onerror = (e) => {
    problem = e.error === "not-allowed" || e.error === "service-not-allowed"
      ? "The microphone is blocked for this app. Allow it in the phone's settings."
      : e.error === "no-speech" ? null : e.error === "network" ? "Voice typing needs the internet." : "Voice typing stopped. Try again.";
  };
  r.onend = () => onStop(problem);
  try { r.start(); } catch { onStop("Voice typing couldn't start. Try again."); }
  return () => { try { r.stop(); } catch { /* already stopped */ } };
}

export function canListen() {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function readAloud(text: string, lang: string) {
  if (!canListen()) return false;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang || "en-IN";
  const v = window.speechSynthesis.getVoices().find((x) => x.lang.toLowerCase().startsWith((lang || "en-IN").slice(0, 2).toLowerCase()));
  if (v) u.voice = v;
  u.rate = 0.95;
  window.speechSynthesis.speak(u);
  return true;
}

export const stopReading = () => { if (canListen()) window.speechSynthesis.cancel(); };
