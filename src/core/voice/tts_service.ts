"use client";

/** Service TTS (Text-to-Speech) pour l'accessibilité voix-first. */

let _supported: boolean | null = null;

export function ttsSupporte(): boolean {
  if (_supported !== null) return _supported;
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    _supported = false;
  } else {
    _supported = true;
  }
  return _supported;
}

export function ttsParler(texte: string, langue = "en-US"): void {
  if (!ttsSupporte()) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(texte);
  utter.lang = langue;
  utter.rate = 0.9;
  utter.pitch = 1.0;
  utter.volume = 1.0;
  window.speechSynthesis.speak(utter);
}

export function ttsArreter(): void {
  if (!ttsSupporte()) return;
  window.speechSynthesis.cancel();
}

/** Dictates a 4-digit OTP code. */
export function ttsDicterCode(code: string): void {
  const caracteres = code.split("").join(", ");
  ttsParler(`Your code is: ${caracteres}`);
}
