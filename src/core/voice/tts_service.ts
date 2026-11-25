"use client";

/** Service TTS (Text-to-Speech) pour l'accessibilité voix-first. */

import { useLangue } from "../i18n";

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

const LANG_VOICE: Record<string, string> = { fr: "fr-FR", en: "en-US" };

/**
 * Choisit la meilleure voix installée pour la langue.
 * Les voix « natural / neural / google / premium » sont bien plus
 * fluides que la voix robotique par défaut du navigateur.
 */
function choisirVoix(codeLangue: string): SpeechSynthesisVoice | null {
  const voix = window.speechSynthesis.getVoices();
  if (voix.length === 0) return null;
  const prefixe = codeLangue.split("-")[0].toLowerCase();
  const memeLangue = voix.filter((v) => v.lang.toLowerCase().startsWith(prefixe));
  const candidates = memeLangue.length > 0 ? memeLangue : voix;
  const score = (v: SpeechSynthesisVoice): number => {
    const n = `${v.name} ${v.voiceURI}`.toLowerCase();
    let s = 0;
    if (/google/.test(n)) s += 40;
    if (/natural|neural|premium|enhanced|siri/.test(n)) s += 30;
    if (/france|fr-fr/.test(n)) s += 10;
    if (v.localService) s += 5;
    return s;
  };
  return candidates.sort((a, b) => score(b) - score(a))[0] ?? null;
}

let _voixPret = false;
function attendreVoix(): Promise<void> {
  if (_voixPret || window.speechSynthesis.getVoices().length > 0) {
    _voixPret = true;
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    const fin = () => {
      _voixPret = true;
      window.speechSynthesis.removeEventListener("voiceschanged", fin);
      resolve();
    };
    window.speechSynthesis.addEventListener("voiceschanged", fin, { once: true });
    // Filet : certains navigateurs n'émettent jamais l'événement.
    setTimeout(fin, 800);
  });
}

export function ttsParler(texte: string, langue?: "fr" | "en"): void {
  if (!ttsSupporte()) return;
  const code = LANG_VOICE[langue ?? useLangue.getState().langue] ?? "fr-FR";
  void attendreVoix().then(() => {
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(texte);
    utter.lang = code;
    const voix = choisirVoix(code);
    if (voix) utter.voice = voix;
    // Débit ralenti : plus clair pour les personnes âgées.
    utter.rate = 0.85;
    utter.pitch = 1.0;
    utter.volume = 1.0;
    window.speechSynthesis.speak(utter);
  });
}

export function ttsArreter(): void {
  if (!ttsSupporte()) return;
  window.speechSynthesis.cancel();
}

/** Dicte un code OTP - dans la langue de l'utilisateur. */
export function ttsDicterCode(code: string): void {
  const fr = useLangue.getState().langue === "fr";
  const caracteres = code.split("").join(", ");
  ttsParler(fr ? `Votre code est : ${caracteres}` : `Your code is: ${caracteres}`);
}
