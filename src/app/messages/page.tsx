"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession, toast } from "@/core/etat/store";
import { useTr } from "@/core/i18n";
import {
  CarteMboa,
  EnTetePage,
  BoutonMboa,
  FondMboa,
  ChargementMboa,
} from "@/core/design_system/composants";
import {
  messagesPour,
  marquerMessagesLus,
  envoyerMessageChat,
} from "@/core/data/depots";
import { MessageChat, RoleMessage } from "@/core/types/message";
import { vibrer } from "@/core/utils/son";
import { formaterDateHeure } from "@/core/utils/format_date";

type Conversation = {
  cle: string;
  nom: string;
  role: RoleMessage | null;
  messages: MessageChat[];
};

const estRoleAdmin = (r: string | null | undefined) => r === "admin" || r === "superadmin";

/** Regroupe les messages en conversations (vue admin). */
function grouperConversations(messages: MessageChat[]): Conversation[] {
  const map = new Map<string, Conversation>();
  for (const m of messages) {
    const deAdmin = estRoleAdmin(m.expediteurRole);
    const cle = deAdmin ? (m.destinataireId ?? "__equipe__") : m.expediteurId;
    let conv = map.get(cle);
    if (!conv) {
      conv = { cle, nom: "", role: null, messages: [] };
      map.set(cle, conv);
    }
    conv.messages.push(m);
    // Le nom/rôle du correspondant vient de ses propres messages.
    if (!deAdmin) {
      conv.nom = m.expediteurNom || conv.nom;
      conv.role = m.expediteurRole;
    } else if (!conv.role && m.destinataireRole) {
      conv.role = m.destinataireRole;
    }
  }
  for (const conv of map.values()) {
    conv.messages.sort((a, b) => a.createdLe.localeCompare(b.createdLe));
    if (!conv.nom) {
      conv.nom = conv.cle === "__equipe__" ? "équipe" : conv.cle.slice(0, 8);
    }
  }
  // Conversations avec le dernier message le plus récent en premier.
  return [...map.values()].sort((a, b) => {
    const da = a.messages[a.messages.length - 1]?.createdLe ?? "";
    const db = b.messages[b.messages.length - 1]?.createdLe ?? "";
    return db.localeCompare(da);
  });
}

/** Bouton micro : enregistre un message vocal (webm/mp4) ≤ 60 s. */
function BoutonVocal({ onAudio, libelle }: { onAudio: (dataUrl: string) => void; libelle: string }) {
  const t = useTr();
  const [enCours, setEnCours] = useState(false);
  const [secondes, setSecondes] = useState(0);
  const enregistreur = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const stream = useRef<MediaStream | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  function arreterEnvoyer() {
    const rec = enregistreur.current;
    if (rec && rec.state !== "inactive") rec.stop();
  }

  async function demarrer() {
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream.current);
      chunks.current = [];
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.current.push(e.data);
      };
      rec.onstop = () => {
        stream.current?.getTracks().forEach((tr) => tr.stop());
        const blob = new Blob(chunks.current, { type: rec.mimeType || "audio/webm" });
        const lecteur = new FileReader();
        lecteur.onload = () => onAudio(String(lecteur.result ?? ""));
        lecteur.readAsDataURL(blob);
        setEnCours(false);
        setSecondes(0);
        if (timer.current) clearInterval(timer.current);
      };
      enregistreur.current = rec;
      rec.start();
      setEnCours(true);
      setSecondes(0);
      timer.current = setInterval(() => {
        setSecondes((s) => {
          if (s >= 60) {
            arreterEnvoyer();
            return s;
          }
          return s + 1;
        });
      }, 1000);
    } catch {
      toast(t("msg.vocalRefuse"));
    }
  }

  function basculer() {
    if (enCours) {
      arreterEnvoyer();
    } else {
      void demarrer();
    }
  }

  return (
    <button
      type="button"
      onClick={basculer}
      aria-label={enCours ? t("msg.arreter") : t("msg.enregistrer")}
      className="btn-mboa !min-h-[48px] !min-w-[48px] !rounded-xl text-2xl relative"
      style={
        enCours
          ? { background: "var(--mboa-error, #C62828)", color: "#fff" }
          : undefined
      }
    >
      {enCours ? "⏹" : "🎤"}
      {enCours && (
        <span className="absolute -top-2 -right-2 text-[11px] font-black text-white bg-black/60 rounded-full px-1.5">
          {secondes}s
        </span>
      )}
      <span className="sr-only">{libelle}</span>
    </button>
  );
}

function BulleMessage({ m, mien }: { m: MessageChat; mien: boolean }) {
  return (
    <div className={`flex ${mien ? "justify-end" : "justify-start"} mb-2`}>
      <div
        className="max-w-[80%] rounded-2xl px-4 py-2.5 shadow-sm"
        style={{
          background: mien ? "var(--mboa-primary)" : "var(--mboa-surface, #fff)",
          color: mien ? "#fff" : "var(--mboa-text)",
          borderBottomRightRadius: mien ? 6 : 16,
          borderBottomLeftRadius: mien ? 16 : 6,
        }}
      >
        {!mien && m.expediteurRole !== "admin" && m.expediteurRole !== "superadmin" && (
          <p className="text-[11px] font-bold opacity-70 mb-0.5">{m.expediteurNom}</p>
        )}
        {m.audio ? (
          <audio controls src={m.audio} className="max-w-full h-10" preload="none" />
        ) : (
          <p className="text-corps whitespace-pre-wrap break-words">{m.texte}</p>
        )}
        <p className={`text-[10px] mt-1 ${mien ? "text-white/70" : "opacity-50"}`}>
          {formaterDateHeure(m.createdLe)}
        </p>
      </div>
    </div>
  );
}

export default function PageMessages() {
  const router = useRouter();
  const { profil } = useSession();
  const t = useTr();
  const [messages, setMessages] = useState<MessageChat[] | null>(null);
  const [texte, setTexte] = useState("");
  const [conversation, setConversation] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const bas = useRef<HTMLDivElement | null>(null);

  const estAdmin = profil?.role === "admin" || profil?.role === "superadmin";

  async function charger() {
    if (!profil) return;
    const msgs = await messagesPour(profil);
    setMessages(msgs);
    await marquerMessagesLus(profil).catch(() => {});
  }

  useEffect(() => {
    if (!profil) {
      const delai = setTimeout(() => router.replace("/connexion"), 400);
      return () => clearTimeout(delai);
    }
    // Premier chargement différé : evite le setState synchrone dans l'effet.
    const premier = setTimeout(() => void charger(), 0);
    const timer = setInterval(() => void charger(), 8000);
    return () => {
      clearTimeout(premier);
      clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profil?.id]);

  const conversations = useMemo(
    () => (estAdmin && messages ? grouperConversations(messages) : []),
    [estAdmin, messages],
  );

  // Fil affiché : admin → conversation choisie ; utilisateur → tout le fil.
  const fil = useMemo(() => {
    if (!messages) return [];
    if (!estAdmin) return messages;
    const conv = conversations.find((c) => c.cle === conversation);
    return conv?.messages ?? [];
  }, [messages, estAdmin, conversations, conversation]);

  // Le correspondant de la conversation admin ouverte (pour la réponse).
  const correspondant = useMemo(() => {
    if (!estAdmin || !conversation) return null;
    const conv = conversations.find((c) => c.cle === conversation);
    if (!conv) return null;
    return { id: conv.cle === "__equipe__" ? null : conv.cle, role: conv.role };
  }, [estAdmin, conversation, conversations]);

  useEffect(() => {
    bas.current?.scrollIntoView({ behavior: "smooth" });
  }, [fil.length]);

  async function envoyer(data?: { texte?: string; audio?: string | null }) {
    if (!profil || envoi) return;
    const contenu = data?.texte ?? texte.trim();
    const audio = data?.audio ?? null;
    if (!contenu && !audio) return;
    setEnvoi(true);
    try {
      await envoyerMessageChat({
        expediteur: profil,
        destinataireId: correspondant?.id ?? null,
        destinataireRole: correspondant?.role ?? null,
        texte: contenu || undefined,
        audio,
      });
      setTexte("");
      vibrer();
      await charger();
    } catch (e) {
      console.error("envoi message", e);
      toast(t("msg.erreurEnvoi"));
    } finally {
      setEnvoi(false);
    }
  }

  if (!profil || messages === null) {
    return (
      <FondMboa>
        <EnTetePage titre={t("msg.titre")} onRetour={() => router.back()} />
        <div className="flex-1 p-4">
          {profil ? (
            <ChargementMboa />
          ) : (
            // Sans compte (ex. candidat /rejoindre), on explique au lieu
            // de tourner un skeleton infini — et on propose la connexion.
            <div className="etat-vide text-center">
              <span className="emoji-vide">💬</span>
              <p className="text-corps text-[var(--mboa-text-doux)] mb-4">{t("msg.besoinCompte")}</p>
              <a href="/connexion" className="btn-mboa btn-primary inline-block">
                {t("msg.allerConnexion")}
              </a>
            </div>
          )}
        </div>
      </FondMboa>
    );
  }

  // ---- Vue admin : liste des conversations ----
  if (estAdmin && conversation === null) {
    return (
      <FondMboa>
        <EnTetePage titre={t("msg.titre")} sousTitre={t("msg.sousTitreAdmin")} onRetour={() => router.back()} />
        <div className="flex-1 p-4 space-y-3 overflow-y-auto">
          {conversations.length === 0 && (
            <CarteMboa>
              <p className="text-corps text-center opacity-70">{t("msg.videAdmin")}</p>
            </CarteMboa>
          )}
          {conversations.map((conv) => {
            const dernier = conv.messages[conv.messages.length - 1];
            const nonLus = conv.messages.filter((m) => !m.lu && !estRoleAdmin(m.expediteurRole)).length;
            return (
              <button
                key={conv.cle}
                onClick={() => setConversation(conv.cle)}
                className="w-full text-left"
              >
                <CarteMboa className="flex items-center gap-3">
                  <span className="text-3xl">{estRoleAdmin(conv.role) ? "🛡️" : conv.role === "fournisseur" ? "🌾" : conv.role === "livreur" ? "🛵" : "🛒"}</span>
                  <span className="flex-1 min-w-0">
                    <span className="text-corps font-bold block truncate">
                      {conv.nom} {nonLus > 0 && <span className="text-[var(--mboa-error)]">● {nonLus}</span>}
                    </span>
                    <span className="text-aide block truncate opacity-70">
                      {dernier?.audio ? "🎤 " : ""}{dernier?.texte || t("msg.vocalSeulement")}
                    </span>
                  </span>
                  <span className="text-[10px] opacity-50 shrink-0">{formaterDateHeure(dernier?.createdLe ?? "")}</span>
                </CarteMboa>
              </button>
            );
          })}
        </div>
      </FondMboa>
    );
  }

  // ---- Fil de discussion (utilisateur ou conversation admin choisie) ----
  const titreConv = estAdmin
    ? conversations.find((c) => c.cle === conversation)?.nom ?? t("msg.titre")
    : t("msg.titre");

  return (
    <FondMboa>
      <EnTetePage
        titre={titreConv}
        sousTitre={estAdmin ? t("msg.sousTitreAdmin") : t("msg.sousTitre")}
        onRetour={() => (estAdmin ? setConversation(null) : router.back())}
      />
      <div className="flex-1 flex flex-col p-4 min-h-0">
        <div className="flex-1 overflow-y-auto space-y-1 pb-3">
          {fil.length === 0 && (
            <CarteMboa>
              <p className="text-corps text-center opacity-70">{t("msg.vide")}</p>
            </CarteMboa>
          )}
          {fil.map((m) => (
            <BulleMessage key={m.id} m={m} mien={m.expediteurId === profil.id} />
          ))}
          <div ref={bas} />
        </div>

        {/* Composer : texte + vocal + envoyer */}
        <div className="flex items-end gap-2 pt-2 border-t border-[var(--mboa-trait, #e0e0e0)]">
          <BoutonVocal libelle={t("msg.vocal")} onAudio={(dataUrl) => void envoyer({ audio: dataUrl })} />
          <input
            value={texte}
            onChange={(e) => setTexte(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void envoyer();
              }
            }}
            placeholder={estAdmin && correspondant && correspondant.id ? t("msg.repondre") : t("msg.ecrire")}
            className="champ-mboa flex-1 !py-3"
            enterKeyHint="send"
          />
          <BoutonMboa
            onClick={() => void envoyer()}
            disabled={envoi || (!texte.trim())}
            className="!min-h-[48px] !min-w-[48px] !rounded-xl text-xl"
          >
            {envoi ? "…" : "➤"}
          </BoutonMboa>
        </div>
        {!estAdmin && (
          <p className="text-[11px] opacity-50 mt-1 text-center">
            {t("msg.infoAdmin")}
          </p>
        )}
      </div>
    </FondMboa>
  );
}
