"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, toast } from "@/core/etat/store";
import { messagesNonLus } from "@/core/data/depots";
import { vibrer, jouerNotificationSonore } from "@/core/utils/son";
import { configurerPush } from "@/core/push";

/**
 * Bouton flottant « discuter avec l'admin » - visible sur tous les menus
 * dès qu'une session existe, avec badge du nombre de messages non lus.
 * Masqué sur la page /messages elle-même.
 */
export function BoutonChatFlottant() {
  const { profil } = useSession();
  const pathname = usePathname();
  const [nonLus, setNonLus] = useState(0);
  // Baseline : le premier comptage ne doit pas notifier (messages déjà
  // là avant l'ouverture de l'app).
  const prec = useRef<number | null>(null);
  // Push : une seule tentative d'abonnement par session et par profil.
  const pushFait = useRef<string | null>(null);

  useEffect(() => {
    if (!profil) return;
    if (pushFait.current !== profil.id) {
      pushFait.current = profil.id;
      void configurerPush(profil);
    }
    let actif = true;
    const charger = () => {
      messagesNonLus(profil)
        .then((n) => {
          if (!actif) return;
          // Nouveau(x) message(s) arrivé(s) pendant qu'on est ailleurs :
          // toast + vibration + bip, comme les notifications de suivi.
          if (prec.current != null && n > prec.current && pathname !== "/messages") {
            toast("💬 Nouveau message");
            vibrer();
            jouerNotificationSonore();
            if (typeof Notification !== "undefined" && Notification.permission === "granted") {
              try {
                new Notification("💬 MBOA BIO", { body: "Nouveau message", icon: "/logo-mboa.jpeg" });
              } catch {
                /* notification indisponible */
              }
            }
          }
          prec.current = n;
          setNonLus(n);
        })
        .catch(() => {});
    };
    charger();
    const timer = setInterval(charger, 45000);
    return () => {
      actif = false;
      clearInterval(timer);
    };
  }, [profil, pathname]);

  if (!profil || pathname === "/messages") return null;

  // Sur les espaces avec nav basse (client, admin), elle occupe ~68px
  // en bas : on remonte le bouton pour ne pas le masquer.
  const avecNavBas =
    (pathname?.startsWith("/consommateur") ?? false) ||
    (pathname?.startsWith("/admin") ?? false) ||
    (pathname?.startsWith("/fournisseur") ?? false);

  return (
    <Link
      href="/messages"
      aria-label="Discuter avec l'admin"
      className={`fixed z-40 w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-2xl transition-transform active:scale-90 ${nonLus > 0 ? "halo-alerte" : ""}`}
      style={{
        bottom: avecNavBas
          ? "calc(5.75rem + env(safe-area-inset-bottom, 0px))"
          : "calc(1.25rem + env(safe-area-inset-bottom, 0px))",
        left: "1rem",
        background: "var(--mboa-secondary, #AED581)",
        color: "#1E5128",
      }}
    >
      💬
      {nonLus > 0 && (
        <span
          className="absolute -top-1 -right-1 min-w-6 h-6 px-1 rounded-full text-white text-xs font-black flex items-center justify-center"
          style={{ background: "var(--mboa-error, #C62828)" }}
        >
          {nonLus > 99 ? "99+" : nonLus}
        </span>
      )}
    </Link>
  );
}
