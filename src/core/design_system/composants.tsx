"use client";

import { ReactNode, useState } from "react";
import { useTr } from "../i18n";

/** Bouton MBOA - cible tactile minimale 72px, coins arrondis 20px. */
export function BoutonMboa({
  children,
  variant = "primary",
  onClick,
  disabled,
  className = "",
}: {
  children: ReactNode;
  variant?: "primary" | "secondary" | "surface" | "error" | "fantome";
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}) {
  const variantClass = {
    primary: "btn-primary",
    secondary: "btn-secondary",
    surface: "btn-surface",
    error: "btn-error",
    fantome: "btn-fantome",
  }[variant];
  return (
    <button
      className={`btn-mboa ${variantClass} ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

/** Carte MBOA - surface blanche, ombre douce, coins arrondis. */
export function CarteMboa({
  children,
  className = "",
  onClick,
  style,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={`card-mboa ${onClick ? "cursor-pointer active:scale-[0.985]" : ""} ${className}`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      style={style}
    >
      {children}
    </div>
  );
}

/** Jauge de stock - dégradé vert sur fond trait. */
export function JaugeMboa({ valeur }: { valeur: number }) {
  return (
    <div className="jauge-mboa">
      <div
        className="jauge-mboa-fill"
        style={{ width: `${Math.min(valeur * 100, 100)}%` }}
      />
    </div>
  );
}

/** Badge de statut - couleur selon le statut de commande. */
export function BadgeStatut({ statut, libelle }: { statut: string; libelle: string }) {
  const couleurs: Record<string, string> = {
    nouvelle: "bg-[var(--mboa-primary-doux)] text-[var(--mboa-primary)]",
    validee_admin: "bg-[var(--mboa-secondary-doux)] text-[var(--mboa-primary)]",
    en_livraison: "bg-[var(--mboa-secondary-doux)] text-[var(--mboa-primary)]",
    livree: "bg-[var(--mboa-primary-doux)] text-[var(--mboa-primary)]",
    recue: "bg-[var(--mboa-primary)] text-white",
    annulee: "bg-[var(--mboa-error-doux)] text-[var(--mboa-error)]",
    propose: "bg-[var(--mboa-primary-doux)] text-[var(--mboa-primary)]",
    valide: "bg-[var(--mboa-secondary-doux)] text-[var(--mboa-primary)]",
    paye: "bg-[var(--mboa-primary)] text-white",
    litige: "bg-[var(--mboa-error-doux)] text-[var(--mboa-error)]",
    annule: "bg-[var(--mboa-error-doux)] text-[var(--mboa-error)]",
  };
  const couleur = couleurs[statut] ?? "bg-gray-200 text-gray-800";
  return (
    <span className={`pastille-mboa ${couleur}`}>
      {libelle}
    </span>
  );
}

/** En-tête de page - dégradé vert animé, titre et bouton retour. */
export function EnTetePage({
  titre,
  sousTitre,
  onRetour,
  action,
  onDeconnexion,
}: {
  titre: string;
  sousTitre?: string;
  onRetour?: () => void;
  action?: ReactNode;
  onDeconnexion?: () => void;
}) {
  const t = useTr();
  return (
    <div className="entete-mboa flex items-center gap-3 p-4">
      {onRetour && (
        <button
          onClick={onRetour}
          className="btn-mboa btn-surface relative z-10 !min-h-[48px] !min-w-[48px] !rounded-xl text-2xl !border-white/40 !bg-white/15 !text-white"
          aria-label={t("a11y.retour")}
        >
          ←
        </button>
      )}
      <div className="flex-1 relative z-10">
        <h1 className="text-ecran text-white">{titre}</h1>
        {sousTitre && <p className="text-aide opacity-85">{sousTitre}</p>}
      </div>
      {action && <div className="relative z-10">{action}</div>}
      {onDeconnexion && (
        <button
          onClick={onDeconnexion}
          className="btn-mboa btn-surface relative z-10 !min-h-[48px] !min-w-[48px] !rounded-xl text-2xl !border-white/40 !bg-white/15 !text-white"
          aria-label={t("a11y.deconnexion")}
          title={t("a11y.deconnexion")}
        >
          ⏻
        </button>
      )}
    </div>
  );
}

/** Pictogramme de catégorie - icône SVG au trait. */
export function PictoCategorie({ categorie, size = 48 }: { categorie: string; size?: number }) {
  const emojis: Record<string, string> = {
    fruit: "🥭",
    tubercule: "🍠",
    legume: "🥬",
    cereale: "🌽",
    viande: "🍗",
    poisson: "🐟",
    huile: "🫒",
    boisson: "🧃",
  };
  return (
    <span style={{ fontSize: size }} aria-hidden>
      {emojis[categorie] ?? "📦"}
    </span>
  );
}

/** Champ mot de passe avec bascule œil afficher/masquer. */
export function ChampMotDePasse({
  value,
  onChange,
  placeholder,
  className = "",
  autoComplete = "current-password",
  style,
}: {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  className?: string;
  autoComplete?: string;
  style?: React.CSSProperties;
}) {
  const [voir, setVoir] = useState(false);
  const t = useTr();
  return (
    <div className="relative">
      <input
        type={voir ? "text" : "password"}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className={`w-full ${voir ? "pr-14 " : ""}${className}`}
        style={style}
      />
      <button
        type="button"
        onClick={() => setVoir((v) => !v)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-xl leading-none"
        style={{ minWidth: 44, minHeight: 44 }}
        aria-label={voir ? t("a11y.masquerMdp") : t("a11y.voirMdp")}
        title={voir ? t("a11y.masquerMdp") : t("a11y.voirMdp")}
      >
        {voir ? "🙈" : "👁️"}
      </button>
    </div>
  );
}

/** Bouton haut-parleur - dit le texte via TTS. */
export function BoutonVoix({ texte, label = "🔊" }: { texte: string; label?: string }) {
  const t = useTr();
  return (
    <button
      className="btn-mboa btn-secondary !min-h-[48px] !min-w-[48px] !rounded-xl text-2xl !shadow-none"
      onClick={() => {
        import("../voice/tts_service").then(({ ttsParler }) => ttsParler(texte));
      }}
      aria-label={t("a11y.ecouter")}
    >
      {label}
    </button>
  );
}

/** Fond vivant - halos animés et filigrane logo. */
export function FondMboa({ children }: { children: ReactNode }) {
  return (
    <div className="fond-mboa flex-1 flex flex-col min-h-screen">
      <div className="filigrane-mboa" aria-hidden />
      <div className="halo-mboa" style={{ width: 220, height: 220, top: -60, right: -70, background: "rgba(139,195,74,0.35)" }} aria-hidden />
      <div className="halo-mboa" style={{ width: 180, height: 180, bottom: 40, left: -80, background: "rgba(46,125,50,0.22)", animationDelay: "-7s" }} aria-hidden />
      <div className="above-filigrane flex-1 flex flex-col">{children}</div>
    </div>
  );
}

/** Splash screen animé - logo MBOA BIO 237. */
export function SplashMboa({ message }: { message?: string }) {
  const t = useTr();
  const slogan = message ?? t("app.slogan");
  return (
    <div className="splash-mboa">
      <div className="halo-mboa" style={{ width: 300, height: 300, top: "8%", left: "-10%", background: "rgba(174,213,129,0.30)" }} aria-hidden />
      <div className="halo-mboa" style={{ width: 260, height: 260, bottom: "6%", right: "-12%", background: "rgba(139,195,74,0.24)", animationDelay: "-6s" }} aria-hidden />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo-mboa.jpeg" alt="MBOA BIO 237" className="splash-logo" />
      <div className="splash-titre text-center">
        <h1 className="text-chiffre-geant text-white">MBOA BIO</h1>
        <p className="text-ecran text-[var(--mboa-secondary)]">237</p>
        <p className="text-aide text-white/75 mt-2">{slogan}</p>
      </div>
      <div className="splash-barre">
        <div className="splash-barre-remplissage" />
      </div>
    </div>
  );
}

/** Pastille de notification avec compteur. */
export function PastilleCompteur({ n }: { n: number }) {
  if (n <= 0) return null;
  return (
    <span className="pastille-mboa bg-[var(--mboa-error)] text-white anim-apparition-zoom">
      {n > 99 ? "99+" : n}
    </span>
  );
}

/** Skeleton de chargement - placeholder animé pendant le fetch des données. */
export function SkeletonMboa({ lignes = 3, hauteur = 80 }: { lignes?: number; hauteur?: number }) {
  return (
    <div className="space-y-3 p-4">
      {Array.from({ length: lignes }).map((_, i) => (
        <div
          key={i}
          className="card-mboa skeleton-mboa"
          style={{ height: hauteur, animationDelay: `${i * 0.1}s` }}
        />
      ))}
    </div>
  );
}
