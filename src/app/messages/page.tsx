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
import { vibrer, jouerNotificationSonore } from "@/core/utils/son";
import { IndicateurTirage } from "@/core/design_system/indicateur_tirage";
import { useTirageRafraichir } from "@/core/utils/use_tirage_rafraichir";
import { formaterDateHeure } from "@/core/utils/format_date";
import { DUREE_MESSAGE_VOCAL } from "@/core/config/app_env";

type Conversation = {
  cle: string;
  nom: string;
  role: RoleMessage | null;
  messages: MessageChat[];
};

const estRoleAdmin = (r: string | null | undefined) => r === "admin" || r === "superadmin";

/** Clé de conversation d'un message pour un utilisateur donné :
 *  « __equipe__ » pour les admins, sinon l'id du correspondant. */
function cleConversation(m: MessageChat, monId: string): string {
  if (m.expediteurId === monId) {
    return m.destinataireId == null || estRoleAdmin(m.destinataireRole) ? "__equipe__" : m.destinataireId;
  }
  return estRoleAdmin(m.expediteurRole) ? "__equipe__" : m.expediteurId;
}

/** Regroupe les messages d'un non-admin (livreur) par correspondant. */
function grouperPourUtilisateur(messages: MessageChat[], monId: string): Conversation[] {
  const map = new Map<string, Conversation>();
  for (const m of messages) {
    const cle = cleConversation(m, monId);
    let conv = map.get(cle);
    if (!conv) {
      conv = { cle, nom: "", role: null, messages: [] };
      map.set(cle, conv);
    }
    conv.messages.push(m);
    if (m.expediteurId === monId) {
      if (!conv.role && m.destinataireRole) conv.role = m.destinataireRole;
    } else {
      conv.nom = m.expediteurNom || conv.nom;
      conv.role = m.expediteurRole;
    }
  }
  for (const conv of map.values()) {
    conv.messages.sort((a, b) => a.createdLe.localeCompare(b.createdLe));
    if (!conv.nom) {
      conv.nom = conv.cle === "__equipe__" ? "équipe" : conv.cle.slice(0, 8);
    }
  }
  return [...map.values()].sort((a, b) => {
    const da = a.messages[a.messages.length - 1]?.createdLe ?? "";
    const db = b.messages[b.messages.length - 1]?.createdLe ?? "";
    return db.localeCompare(da);
  });
}

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
          if (s >= DUREE_MESSAGE_VOCAL) {
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
  // Dernier message entrant connu : sert à vibrer/bipper quand un
  // nouveau message arrive pendant qu'on regarde la conversation.
  const dernierRecu = useRef<string | null>(null);
  // Conversation directe ouverte via ?avec=<id>&nom=<nom>&role=<role>
  // (ex. client → livreur depuis la page suivi).
  const [convInitiale, setConvInitiale] = useState<{ id: string; nom: string; role: RoleMessage | null } | null>(null);

  const estAdmin = profil?.role === "admin" || profil?.role === "superadmin";
  const estLivreur = profil?.role === "livreur";
  const vueConversations = estAdmin || estLivreur;

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const avec = q.get("avec");
    if (!avec) return;
    const d = setTimeout(() => {
      setConvInitiale({
        id: avec,
        nom: q.get("nom") ?? "",
        role: (q.get("role") as RoleMessage | null) ?? null,
      });
      // Pour les vues à conversations (admin/livreur), on ouvre
      // directement le fil — même s'il n'existe pas encore.
      if (estAdmin || estLivreur) setConversation(avec);
    }, 0);
    return () => clearTimeout(d);
  }, [estAdmin, estLivreur]);

  async function charger() {
    if (!profil) return;
    const msgs = await messagesPour(profil);
    // Message entrant plus récent que le dernier connu → alerte
    // discrète (son + vibration), sans notifier les siens.
    const recus = msgs
      .filter((m) => m.expediteurId !== profil.id)
      .sort((a, b) => b.createdLe.localeCompare(a.createdLe));
    const plusRecent = recus[0];
    if (plusRecent && dernierRecu.current && plusRecent.id !== dernierRecu.current) {
      vibrer();
      jouerNotificationSonore();
    }
    if (plusRecent) dernierRecu.current = plusRecent.id;
    setMessages(msgs);
    // Le marquage « lu » se fait dans l'effet dédié, scopé au fil
    // ouvert — pas ici, sinon tous les fils perdent leurs badges.
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

  // Tirer vers le bas depuis le haut = recharger la conversation.
  const { distance: ptrDistance, enCours: ptrCours } = useTirageRafraichir(charger);

  const conversations = useMemo(
    () =>
      vueConversations && messages && profil
        ? estAdmin
          ? grouperConversations(messages)
          : grouperPourUtilisateur(messages, profil.id)
        : [],
    [vueConversations, estAdmin, messages, profil],
  );

  // Fil affiché : conversations (admin/livreur) → fil choisi ;
  // utilisateur → « équipe » par défaut ou la conversation directe ?avec.
  const fil = useMemo(() => {
    if (!messages || !profil) return [];
    if (vueConversations) {
      const conv = conversations.find((c) => c.cle === conversation);
      return conv?.messages ?? [];
    }
    const cle = convInitiale?.id ?? "__equipe__";
    return messages.filter((m) => cleConversation(m, profil.id) === cle);
  }, [messages, profil, vueConversations, conversations, conversation, convInitiale]);

  // Le correspondant pour la réponse : conversation choisie (admin/
  // livreur) ou conversation directe ?avec (client/fournisseur).
  const correspondant = useMemo(() => {
    if (!vueConversations) {
      return convInitiale ? { id: convInitiale.id, role: convInitiale.role } : null;
    }
    if (!conversation) return null;
    const conv = conversations.find((c) => c.cle === conversation);
    // Conversation pas encore dans la liste (premier message) : on
    // retombe sur le deep-link ?avec pour connaître le correspondant.
    if (!conv) {
      return convInitiale?.id === conversation
        ? { id: conversation, role: convInitiale.role }
        : null;
    }
    return {
      id: conv.cle === "__equipe__" ? null : conv.cle,
      role: conv.role ?? (conv.cle === convInitiale?.id ? convInitiale.role : null),
    };
  }, [vueConversations, conversation, conversations, convInitiale]);

  useEffect(() => {
    bas.current?.scrollIntoView({ behavior: "smooth" });
  }, [fil.length]);

  // Marque « lu » uniquement le fil affiché : les autres conversations
  // gardent leur badge de non lus. En vue liste (pas de fil ouvert),
  // rien n'est marqué.
  useEffect(() => {
    if (!profil || !messages) return;
    const d = setTimeout(() => {
      let filtre: ((m: MessageChat) => boolean) | undefined;
      if (vueConversations) {
        if (!conversation) return;
        const conv = conversations.find((c) => c.cle === conversation);
        if (!conv) return;
        const ids = new Set(conv.messages.map((m) => m.id));
        filtre = (m) => ids.has(m.id);
      } else {
        const cle = convInitiale?.id ?? "__equipe__";
        filtre = (m) => cleConversation(m, profil.id) === cle;
      }
      void marquerMessagesLus(profil, filtre).catch(() => {});
    }, 0);
    return () => clearTimeout(d);
  }, [profil, messages, vueConversations, conversation, conversations, convInitiale]);

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
            // de tourner un skeleton infini - et on propose la connexion.
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

  // ---- Vue conversations (admin/livreur) : liste des fils ----
  if (vueConversations && conversation === null) {
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

  // ---- Fil de discussion (conversation choisie ou fil utilisateur) ----
  const titreConv = vueConversations
    ? (conversations.find((c) => c.cle === conversation)?.nom ??
        (convInitiale?.id === conversation ? convInitiale.nom : "")) ||
      t("msg.titre")
    : convInitiale?.nom || t("msg.titre");

  return (
    <FondMboa>
      <IndicateurTirage distance={ptrDistance} enCours={ptrCours} />
      <EnTetePage
        titre={titreConv}
        sousTitre={vueConversations ? t("msg.sousTitreAdmin") : convInitiale ? t("msg.sousTitreDirect") : t("msg.sousTitre")}
        onRetour={() => (vueConversations ? setConversation(null) : router.back())}
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
        {!vueConversations && (
          <p className="text-[11px] opacity-50 mt-1 text-center">
            {convInitiale ? t("msg.infoDirect") : t("msg.infoAdmin")}
          </p>
        )}
      </div>
    </FondMboa>
  );
}
