"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/core/etat/store";
import { fileAttenteAchats, toutesCommandes, chargerStock, chargerLivreurs, chargerFournisseurs, activitesAdmin, synchroniserFileAttente, compterFile, ActiviteAdmin } from "@/core/data/depots";
import { fileCompte } from "@/core/data/base_locale";
import { CarteMboa, BoutonMboa, EnTetePage, FondMboa, PastilleCompteur, SkeletonMboa } from "@/core/design_system/composants";
import { Achat } from "@/core/types/achat";
import { Commande, commandeMontantAPayer } from "@/core/types/commande_full";
import { Produit } from "@/core/types/produit";
import { Livreur } from "@/core/types/livreur";
import { Fournisseur } from "@/core/types/fournisseur";
import { StatutCommande } from "@/core/types/statuts";
import { formaterFcfa } from "@/core/utils/format_monnaie";
import { tousComptes, CompteAuth } from "@/core/auth/auth_service";
import { useGuardRole } from "@/core/auth/use_guard_role";
import { useActualisation } from "@/core/utils/use_actualisation";
import { useTr } from "@/core/i18n";
import { sonNotificationActif, basculerSonNotification } from "@/core/utils/son";
import { supabaseConfigure } from "@/core/config/app_env";

function SonToggle() {
  const t = useTr();
  const [actif, setActif] = useState(() => sonNotificationActif());
  return (
    <button
      onClick={() => setActif(basculerSonNotification())}
      className="text-aide font-bold"
      style={{ color: actif ? "var(--mboa-primary)" : "var(--mboa-text-doux)" }}
      aria-pressed={actif}
    >
      {actif ? `🔔 ${t("adm.act.sonOn")}` : `🔕 ${t("adm.act.sonOff")}`}
    </button>
  );
}

export default function TableauAdmin() {
  const router = useRouter();
  const { pret, profil } = useGuardRole("admin");
  const t = useTr();
  const { deconnexion } = useSession();
  const [achats, setAchats] = useState<Achat[]>([]);
  const [commandes, setCommandes] = useState<Commande[]>([]);
  const [stock, setStock] = useState<Produit[]>([]);
  const [livreurs, setLivreurs] = useState<Livreur[]>([]);
  const [fournisseurs, setFournisseurs] = useState<Fournisseur[]>([]);
  const [comptes, setComptes] = useState<CompteAuth[]>([]);
  const [activites, setActivites] = useState<ActiviteAdmin[]>([]);
  const [notifOk, setNotifOk] = useState(false);
  const [opsFile, setOpsFile] = useState(0);
  const [opsAttente, setOpsAttente] = useState(0);
  const [syncEnCours, setSyncEnCours] = useState(false);

  async function verifierFile() {
    setOpsAttente(await fileCompte());
  }

  async function synchroniserMaintenant() {
    setSyncEnCours(true);
    await synchroniserFileAttente();
    await verifierFile();
    setSyncEnCours(false);
  }

  async function charger() {
    const [a, c, s, l, f, cp] = await Promise.all([
      fileAttenteAchats(),
      toutesCommandes(),
      chargerStock(),
      chargerLivreurs(),
      chargerFournisseurs(),
      tousComptes(),
    ]);
    setAchats(a);
    setCommandes(c);
    setStock(s);
    setLivreurs(l);
    setFournisseurs(f);
    setComptes(cp);
    const acts = await activitesAdmin();
    setActivites(acts);
    setOpsFile(await compterFile().catch(() => 0));
    const { verifierNouvellesActivitesAdmin } = await import("@/core/utils/son");
    verifierNouvellesActivitesAdmin(acts.map((a) => a.id));
    if (typeof Notification !== "undefined") setNotifOk(Notification.permission === "granted");
    verifierFile();
  }

  // Recharge au montage, toutes les 30 s et au retour sur l'onglet.
  useActualisation(charger);

  async function demanderNotif() {
    if (typeof Notification === "undefined") return;
    const perm = await Notification.requestPermission();
    setNotifOk(perm === "granted");
  }

  const devisNouveaux = commandes.filter((c) => c.statut === StatutCommande.nouvelle).length;
  const aPointer = commandes.filter((c) => c.statut === StatutCommande.livree).length;
  const enLivraison = commandes.filter((c) => c.statut === StatutCommande.enLivraison).length;

  // Valeur du stock
  const valeurStock = stock.reduce((s, p) => s + p.prix * p.quantite, 0);
  const coutStock = stock.reduce((s, p) => s + (p.prixAchat ?? 0) * p.quantite, 0);
  const margePotentielle = valeurStock - coutStock;

  // Alertes stock bas
  const stockBas = stock.filter((p) => p.actif && p.quantite > 0 && p.quantite <= 5);
  const ruptures = stock.filter((p) => p.actif && p.quantite <= 0);

  // Comptes - alerte mot de passe admin par défaut
  const mdpParDefaut = comptes.find((c) => c.role === "admin" && c.motDePasseParDefaut);

  if (!pret) {
    return (
      <FondMboa>
        <div className="flex-1 p-4">
          <SkeletonMboa lignes={6} />
        </div>
      </FondMboa>
    );
  }

  // Statistiques du jour
  const aujourd = new Date().toDateString();
  const commandesJour = commandes.filter((c) => new Date(c.createdLe).toDateString() === aujourd);
  const caJour = commandesJour.reduce((s, c) => s + commandeMontantAPayer(c), 0);
  const commandesTerminees = commandes.filter((c) => c.statut === StatutCommande.recue);
  const caTotal = commandesTerminees.reduce((s, c) => s + commandeMontantAPayer(c), 0);

  return (
    <FondMboa>
      <EnTetePage
        titre="MBOA ADMIN"
        sousTitre={t("adm.sousTitre")}
        onDeconnexion={() => {
          deconnexion();
          router.push("/connexion");
        }}
      />

      {/* Statut de la synchronisation cloud */}
      <div className="px-4 pb-2 text-center">
        <span
          className="text-aide px-3 py-1 rounded-full inline-block"
          style={{
            background: supabaseConfigure ? "var(--mboa-secondary-doux)" : "var(--mboa-error-doux)",
            color: supabaseConfigure ? "var(--mboa-primary)" : "var(--mboa-error)",
          }}
        >
          {supabaseConfigure ? `☁️ ${t("adm.sync.actif")}` : `⚠️ ${t("adm.sync.local")}`}
        </span>
        {opsFile > 0 && (
          <span
            className="text-aide px-3 py-1 rounded-full inline-block ml-2"
            style={{ background: "var(--mboa-error-doux)", color: "var(--mboa-error)" }}
          >
            ⏳ {t("adm.sync.fileAttente").replace("{n}", String(opsFile))}
          </span>
        )}
      </div>

      {/* Opérations hors-ligne en attente de synchronisation */}
      {opsAttente > 0 && (
        <div className="px-4 pb-2">
          <CarteMboa className="bg-[var(--mboa-secondary-doux)]">
            <div className="flex items-center justify-between gap-3">
              <p className="text-corps font-bold text-[var(--mboa-primary)]">
                📴 {t("adm.sync.attente").replace("{n}", String(opsAttente))}
              </p>
              <BoutonMboa
                variant="primary"
                className="!min-h-[40px] !px-4"
                disabled={syncEnCours}
                onClick={synchroniserMaintenant}
              >
                {syncEnCours ? "…" : `☁️ ${t("adm.sync.maintenant")}`}
              </BoutonMboa>
            </div>
          </CarteMboa>
        </div>
      )}

      {/* Compteurs rapides */}
      <div className="p-4 grid grid-cols-3 gap-3">
        <CarteMboa className="text-center anim-apparition card-accent">
          <p className="text-aide text-[var(--mboa-text-doux)]">{t("adm.devis")}</p>
          <p className="text-chiffre-geant text-[var(--mboa-primary)]">{devisNouveaux}</p>
        </CarteMboa>
        <CarteMboa className="text-center anim-apparition anim-retard-1 card-accent">
          <p className="text-aide text-[var(--mboa-text-doux)]">{t("adm.recoltes")}</p>
          <p className="text-chiffre-geant text-[var(--mboa-primary)]">{achats.length}</p>
        </CarteMboa>
        <CarteMboa className="text-center anim-apparition anim-retard-2 card-accent">
          <p className="text-aide text-[var(--mboa-text-doux)]">{t("adm.aSigner")}</p>
          <p className="text-chiffre-geant text-[var(--mboa-error)]">{aPointer}</p>
        </CarteMboa>
      </div>

      {/* Alerte mot de passe par défaut */}
      {mdpParDefaut && (
        <div className="px-4 pb-2">
          <CarteMboa className="bg-[var(--mboa-error-doux)] anim-secousse">
            <p className="text-corps font-bold text-[var(--mboa-error)]">
              🔐 {t("adm.alerteMdp")}
            </p>
            <p className="text-aide text-[var(--mboa-error)] mt-1">
              {t("adm.alerteMdp2")}
            </p>
            <button
              onClick={() => router.push("/admin/compte")}
              className="text-aide text-[var(--mboa-error)] underline mt-2 font-bold"
            >
              {t("adm.changer")}
            </button>
          </CarteMboa>
        </div>
      )}

      {/* Statistiques du jour */}
      <div className="px-4">
        <h2 className="text-titre titre-section mb-2">{t("adm.aujourdhui")}</h2>
        <div className="grid grid-cols-2 gap-3">
          <CarteMboa className="text-center">
            <p className="text-aide text-[var(--mboa-text-doux)]">{t("adm.commandes")}</p>
            <p className="text-chiffre text-[var(--mboa-primary)]">{commandesJour.length}</p>
          </CarteMboa>
          <CarteMboa className="text-center">
            <p className="text-aide text-[var(--mboa-text-doux)]">{t("adm.caJour")}</p>
            <p className="text-chiffre text-[var(--mboa-primary)]">{formaterFcfa(caJour)}</p>
          </CarteMboa>
        </div>
      </div>

      {/* Vue d'ensemble */}
      <div className="p-4">
        <h2 className="text-titre titre-section mb-2">{t("adm.vue")}</h2>
        <CarteMboa className="space-y-1">
          <div className="flex justify-between text-corps">
            <span className="text-[var(--mboa-text-doux)]">{t("adm.caTotal")}</span>
            <span className="font-bold text-[var(--mboa-primary)]">{formaterFcfa(caTotal)}</span>
          </div>
          <div className="flex justify-between text-corps">
            <span className="text-[var(--mboa-text-doux)]">{t("adm.valeurStock")}</span>
            <span className="font-bold">{formaterFcfa(valeurStock)}</span>
          </div>
          <div className="flex justify-between text-corps">
            <span className="text-[var(--mboa-text-doux)]">{t("adm.coutStock")}</span>
            <span className="font-bold">{formaterFcfa(coutStock)}</span>
          </div>
          <div className="flex justify-between text-corps border-t border-[var(--mboa-trait)] pt-1">
            <span className="text-[var(--mboa-text-doux)]">{t("adm.marge")}</span>
            <span className="font-bold text-[var(--mboa-primary)]">{formaterFcfa(margePotentielle)}</span>
          </div>
          <div className="flex justify-between text-corps">
            <span className="text-[var(--mboa-text-doux)]">{t("adm.enRoute")}</span>
            <span className="font-bold text-[var(--mboa-secondary)]">{enLivraison}</span>
          </div>
        </CarteMboa>
      </div>

      {/* Alertes stock */}
      {(stockBas.length > 0 || ruptures.length > 0) && (
        <div className="px-4">
          <h2 className="text-titre titre-section mb-2">{t("adm.alertes")}</h2>
          {ruptures.length > 0 && (
            <CarteMboa className="mb-2 bg-[var(--mboa-error-doux)]">
              <p className="text-aide text-[var(--mboa-error)] font-bold mb-1">{t("adm.rupture")} ({ruptures.length})</p>
              <div className="flex flex-wrap gap-1">
                {ruptures.map((p) => (
                  <span key={p.id} className="text-aide px-2 py-0.5 rounded-full" style={{ background: "var(--mboa-surface)" }}>{p.nom}</span>
                ))}
              </div>
            </CarteMboa>
          )}
          {stockBas.length > 0 && (
            <CarteMboa className="bg-yellow-50">
              <p className="text-aide text-yellow-800 font-bold mb-1">{t("adm.stockBas")} ({stockBas.length})</p>
              <div className="flex flex-wrap gap-1">
                {stockBas.map((p) => (
                  <span key={p.id} className="text-aide px-2 py-0.5 rounded-full" style={{ background: "var(--mboa-surface)" }}>{p.nom} ({p.quantite})</span>
                ))}
              </div>
            </CarteMboa>
          )}
        </div>
      )}

      {/* Activité des autres admins + notifications */}
      <div className="px-4 pb-2">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-titre titre-section">{t("adm.act.titre")}</h2>
          {!notifOk && typeof Notification !== "undefined" && Notification.permission !== "denied" && (
            <button
              onClick={demanderNotif}
              className="text-aide text-[var(--mboa-primary)] font-bold"
            >
              {t("adm.act.activerNotif")}
            </button>
          )}
          {notifOk && <span className="text-aide text-[var(--mboa-text-doux)]">{t("adm.act.notifOk")}</span>}
          <SonToggle />
        </div>
        {activites.length === 0 ? (
          <CarteMboa>
            <p className="text-corps text-[var(--mboa-text-doux)] text-center">{t("adm.act.vide")}</p>
          </CarteMboa>
        ) : (
          <CarteMboa className="space-y-1">
            {activites.slice(0, 6).map((a) => (
              <div key={a.id} className="flex justify-between text-corps">
                <span>
                  <strong>{a.auteur}</strong> {t(a.action)}
                  {a.detail ? ` · ${a.detail}` : ""}
                </span>
                <span className="text-aide text-[var(--mboa-text-doux)] whitespace-nowrap ml-2">
                  {new Date(a.quand).toLocaleString()}
                </span>
              </div>
            ))}
          </CarteMboa>
        )}
      </div>

      {/* Raccourcis - tuiles icônes */}
      <div className="px-4 pb-6">
        <h2 className="text-titre titre-section mb-3">{t("adm.gestion")}</h2>
        <div className="grid grid-cols-2 gap-3">
          {([
            { href: "/admin/devis", emoji: "📝", label: t("adm.devis2"), badge: commandes.length },
            { href: "/admin/achats", emoji: "📋", label: t("adm.fileAchats"), badge: achats.length },
            { href: "/admin/livraisons", emoji: "🏍️", label: t("adm.livraisons"), badge: aPointer },
            { href: "/admin/stock", emoji: "📦", label: t("adm.stock"), badge: stock.length },
            { href: "/admin/categories", emoji: "🏷️", label: t("adm.categories"), badge: null },
            { href: "/admin/packs", emoji: "🍲", label: t("adm.packs"), badge: null },
            {
              href: "/admin/fournisseurs", emoji: "👨‍🌾", label: t("adm.fournisseurs"),
              badge: fournisseurs.filter((f) => !f.actif).length > 0
                ? fournisseurs.filter((f) => !f.actif).length
                : null,
              badgeLabel: fournisseurs.filter((f) => !f.actif).length > 0 ? t("adm.fourn.enAttente") : null,
            },
            { href: "/admin/livreurs", emoji: "🛵", label: t("adm.livreurs"), badge: livreurs.length },
            { href: "/admin/compte", emoji: "🔐", label: t("adm.compte"), badge: null },
          ] as const).map((item) => (
            <button
              key={item.href}
              onClick={() => router.push(item.href)}
              className="btn-mboa btn-surface !p-3 flex flex-col items-center gap-1.5 text-center !min-h-[72px] transition-transform hover:-translate-y-0.5"
              style={{ position: "relative" }}
            >
              <span className="w-10 h-10 rounded-full bg-[var(--mboa-secondary-doux)] flex items-center justify-center text-2xl">
                {item.emoji}
              </span>
              <span className="text-corps font-bold leading-tight">{item.label}</span>
              {item.badge != null && (
                <span className="absolute top-1.5 right-1.5 bg-[var(--mboa-primary)] text-white text-aide font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    </FondMboa>
  );
}
