"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession, usePanier, useData, useReseau, toast } from "@/core/etat/store";
import { chargerVitrine, chargerCatalogue, commandesCliente, compterFile } from "@/core/data/depots";
import { CarteMboa, JaugeMboa, PictoCategorie, BoutonVoix, EnTetePage, BoutonMboa, FondMboa, SkeletonMboa, ChargementMboa } from "@/core/design_system/composants";
import { CATEGORIES_ORDREES } from "@/core/types/categorie";
import { categoriesPerso, libelleCategorie, emojiCategorie, CategoriePerso } from "@/core/data/categories";
import { Produit, produitAnnonceVocale, produitDisponibilite, produitPrixLabel, produitJauge, produitEstRupture, produitUniteReelle, produitEstVitrine, produitEstPack } from "@/core/types/produit";
import { Commande } from "@/core/types/commande_full";
import { useGuardRole } from "@/core/auth/use_guard_role";
import { useActualisation } from "@/core/utils/use_actualisation";
import { useTr } from "@/core/i18n";
import { formaterDate } from "@/core/utils/format_date";
import { toutesAnnonces } from "@/core/data/depots";
import { TYPE_ANNONCE_INFO, Annonce } from "@/core/types/annonce";
import { annonceEstPhare, annoncePromoPct, annonceExpiree } from "@/core/utils/promos";
import { notifierNouvellesAnnonces } from "@/core/utils/annonces_notif";
import { OnboardingMboa, estOnboardingVu } from "@/core/design_system/onboarding";
import { vibrer } from "@/core/utils/son";

export default function MarchePage() {
  const router = useRouter();
  const { pret, profil } = useGuardRole("consommateur");
  const { deconnexion } = useSession();
  const panier = usePanier();
  const { vitrine, catalogue, setVitrine, setCatalogue } = useData();
  const { enLigne, fileAttente, setEnLigne, setFileAttente } = useReseau();
  const [persos, setPersos] = useState<CategoriePerso[]>([]);
  const [commandes, setCommandes] = useState<Commande[]>([]);
  const [recherche, setRecherche] = useState("");
  const [tri, setTri] = useState<"nom" | "prix_asc" | "prix_desc">("nom");
  const [annonces, setAnnonces] = useState<Annonce[]>([]);
  const [annonceFermee, setAnnonceFermee] = useState("");
  const [onboarding, setOnboarding] = useState(false);
  const [filtreCat, setFiltreCat] = useState("");
  const t = useTr();

  async function charger() {
    const [v, c, p, a] = await Promise.all([chargerVitrine(), chargerCatalogue(), categoriesPerso(), toutesAnnonces()]);
    setAnnonces(a.filter((x) => x.actif && !annonceExpiree(x)));
    void notifierNouvellesAnnonces(a.filter((x) => x.actif));
    // The customer only sees real stock: active and quantity > 0
    setVitrine(v.filter(produitEstVitrine));
    setCatalogue(c);
    setPersos(p);
    if (profil) {
      const cmds = await commandesCliente(profil.id);
      setCommandes(cmds);
    }
    const compte = await compterFile();
    setFileAttente(compte);
  }

  // Recharge au montage, toutes les 60 s et au retour sur l'onglet :
  // le stock et les prix restent frais sans action du client.
  useActualisation(charger, 60000);

  useEffect(() => {
    // Visite guidée : une seule fois, après hydratation des données.
    if (!estOnboardingVu()) setOnboarding(true);
    // Notifications promos : demande la permission une fois (silencieuse si refusée).
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      void Notification.requestPermission().catch(() => {});
    }
    const handler = () => setEnLigne(navigator.onLine);
    window.addEventListener("online", handler);
    window.addEventListener("offline", handler);
    return () => {
      window.removeEventListener("online", handler);
      window.removeEventListener("offline", handler);
    };
  }, [setEnLigne]);

  if (!pret) {
    return (
      <FondMboa>
        <div className="flex-1 p-4">
          <ChargementMboa />
        </div>
      </FondMboa>
    );
  }

  // Produits phares : les annonces « phare » nomment un produit du marché.
  const produitsPhares = vitrine.filter((p) => annonceEstPhare(annonces, p));
  const promoPct = (p: Produit) => annoncePromoPct(annonces, p);
  // « Nouveau » : produit ajouté au stock il y a moins de 7 jours.
  const estNouveau = (p: Produit) =>
    !!p.createdLe && Date.now() - new Date(p.createdLe).getTime() < 7 * 24 * 3600 * 1000;

  const produitsFiltres = vitrine.filter((p) =>
    (!filtreCat || p.categorie === filtreCat) &&
    (!recherche.trim() || p.nom.toLowerCase().includes(recherche.toLowerCase()))
  ).sort((a, b) => {
    if (tri === "prix_asc") return a.prix - b.prix;
    if (tri === "prix_desc") return b.prix - a.prix;
    return a.nom.localeCompare(b.nom);
  });

  function poserAuPanier(produit: Produit) {
    const u = produitUniteReelle(produit);
    // Si une annonce promo accorde un % sur ce produit, le panier applique
    // le prix réduit — l'affichage et le montant restent cohérents.
    const pct = promoPct(produit);
    const prix = pct ? Math.round(produit.prix * (1 - pct / 100)) : produit.prix;
    panier.poser({
      produitId: produit.id,
      slug: produit.slug,
      nom: produit.nom,
      categorie: produit.categorie,
      quantite: 1,
      prix,
      coutAchat: produit.prixAchat ?? 0,
      photo: produit.photoReelle,
      unite: u,
      composants: produit.composants,
    });
    vibrer();
    toast(`${produit.nom} ${t("toast.ajoute")}`);
  }

  return (
    <FondMboa>
      <EnTetePage
        titre={t("march.titre")}
        sousTitre={profil ? `${t("march.bonjour")} ${profil.nom}` : "MBOA BIO 237"}
        onDeconnexion={() => {
          deconnexion();
          router.push("/connexion");
        }}
        action={
          <Link href="/consommateur/panier" className="relative">
            <button className="btn-mboa btn-surface !min-h-[48px] !min-w-[48px] !rounded-xl text-2xl">
              🛒
            </button>
            {panier.compte() > 0 && (
              <span key={panier.compte()} className="absolute -top-1 -right-1 bg-[var(--mboa-error)] text-white rounded-full w-6 h-6 flex items-center justify-center text-aide font-bold anim-apparition-zoom">
                {panier.compte()}
              </span>
            )}
          </Link>
        }
      />

      {/* Network indicator - pastille discrete */}
      <div className="px-4 py-1 flex justify-center">
        <span
          className="text-aide px-3 py-1 rounded-full inline-flex items-center gap-1.5"
          style={{
            background: enLigne ? "var(--mboa-secondary-doux)" : "var(--mboa-error-doux)",
            color: enLigne ? "var(--mboa-primary)" : "var(--mboa-error)",
          }}
        >
          <span className={`w-2 h-2 rounded-full ${enLigne ? "bg-[var(--mboa-primary-vif)]" : "bg-[var(--mboa-error)]"} ${!enLigne ? "anim-pulsation" : ""}`} />
          {enLigne ? t("march.enLigne") : t("march.horsLigne")}
          {fileAttente > 0 ? ` · ${fileAttente} ${t("march.enAttente")}` : ""}
        </span>
      </div>

      {/* My orders */}
      {commandes.length > 0 && (
        <div className="px-4 py-2">
          <Link href="/consommateur/suivi">
            <CarteMboa className="flex items-center justify-between">
              <span className="text-corps">{t("march.mesCommandes")}</span>
              <span className="text-aide text-[var(--mboa-primary)] font-bold">{commandes.length} →</span>
            </CarteMboa>
          </Link>
        </div>
      )}

      {/* Hero d'accueil */}
      <div className="px-4 pt-3">
        <div className="hero-mboa p-5">
          <p className="text-aide opacity-90 font-bold">{t("march.heroSouhaite")}</p>
          <h1 className="text-ecran mt-1">
            {profil?.nom ? `${t("march.heroSalut")}, ${profil.nom.split(" ")[0]} !` : t("march.heroSalut")}
          </h1>
          <p className="text-corps opacity-95 mt-1">{t("march.heroTexte")}</p>
          {/* Stats vivantes : produits, promos actives, commandes */}
          <div className="flex gap-2 mt-3 flex-wrap">
            {[
              ["🥬", vitrine.length, t("march.statProduits")],
              ["🏷️", annonces.filter((a) => a.type === "promo").length, t("march.statPromos")],
              ["📦", commandes.filter((c) => !c.clos).length, t("march.statCommandes")],
            ].map(([emoji, n, label]) => (
              <span
                key={label as string}
                className="px-3 py-1.5 rounded-full text-aide font-bold inline-flex items-center gap-1.5"
                style={{ background: "rgba(255,255,255,0.18)", backdropFilter: "blur(4px)" }}
              >
                {emoji} {n} {label}
              </span>
            ))}
          </div>
        </div>

        {/* Annonces du comptoir : promo / info / produit phare */}
        {annonces.filter((a) => a.actif && a.id !== annonceFermee).map((a) => {
          const info = TYPE_ANNONCE_INFO[a.type] ?? TYPE_ANNONCE_INFO.info;
          const fond =
            a.type === "promo" ? "var(--mboa-accent-doux)" : a.type === "phare" ? "var(--mboa-secondary-doux)" : "var(--mboa-info-doux, rgba(59,130,246,0.12))";
          return (
            <div
              key={a.id}
              className="mt-3 rounded-2xl p-4 relative anim-apparition flex items-start gap-3"
              style={{ background: fond, border: "1px solid var(--mboa-border)" }}
            >
              <span className="text-3xl" aria-hidden>{info.emoji}</span>
              <div className="min-w-0">
                <p className="text-aide font-bold" style={{ color: "var(--mboa-primary)" }}>{info.libelle}</p>
                <p className="text-corps font-bold mt-0.5">{a.titre}</p>
                {a.texte ? <p className="text-aide mt-0.5">{a.texte}</p> : null}
                {a.expireLe ? <p className="text-aide mt-0.5 font-bold">⏳ {formaterDate(a.expireLe)}</p> : null}
              </div>
              <button
                onClick={() => setAnnonceFermee(a.id)}
                aria-label="Fermer"
                className="ml-auto shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-aide"
                style={{ background: "rgba(255,255,255,0.6)" }}
              >
                ✕
              </button>
            </div>
          );
        })}
      </div>

      {/* Search + sort */}
      <div className="px-4 py-3">
        <div className="champ-recherche mb-2">
          <span aria-hidden>🔍</span>
          <input
            type="text"
            placeholder={t("march.recherche")}
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
          />
          {recherche && (
            <button onClick={() => setRecherche("")} aria-label="Effacer" className="text-aide font-bold opacity-70">✕</button>
          )}
        </div>
        {/* Filtre rapide par catégorie — ne montre que les catégories
            réellement présentes dans le stock affiché. */}
        {(() => {
          const presentes = [...new Set(vitrine.map((p) => p.categorie))];
          if (presentes.length < 2) return null;
          return (
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4" style={{ scrollbarWidth: "none" }}>
              <button
                onClick={() => setFiltreCat("")}
                className="px-3 py-1.5 rounded-full text-aide shrink-0 font-bold"
                style={{
                  background: filtreCat === "" ? "var(--mboa-primary)" : "var(--mboa-surface)",
                  color: filtreCat === "" ? "#fff" : "var(--mboa-text)",
                }}
              >
                {t("march.tous")}
              </button>
              {presentes.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setFiltreCat(filtreCat === cat ? "" : cat)}
                  className="px-3 py-1.5 rounded-full text-aide shrink-0 font-bold"
                  style={{
                    background: filtreCat === cat ? "var(--mboa-primary)" : "var(--mboa-surface)",
                    color: filtreCat === cat ? "#fff" : "var(--mboa-text)",
                  }}
                >
                  {emojiCategorie(cat, persos) ? `${emojiCategorie(cat, persos)} ` : ""}{libelleCategorie(cat, persos)}
                </button>
              ))}
            </div>
          );
        })()}
        <div className="flex gap-2">
          {([["nom", "A-Z"], ["prix_asc", t("march.prixAsc")], ["prix_desc", t("march.prixDesc")]] as const).map(([v, label]) => (
            <button
              key={v}
              onClick={() => setTri(v)}
              className="px-3 py-1 rounded-full text-aide"
              style={{
                background: tri === v ? "var(--mboa-primary)" : "var(--mboa-surface)",
                color: tri === v ? "white" : "var(--mboa-text)",
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Category grid */}
      <div className="px-4 py-2">
        <h2 className="text-titre titre-section mb-3">{t("march.categories")}</h2>
        <div className="grid grid-cols-4 gap-2">
          {[...CATEGORIES_ORDREES, ...persos.map((x) => x.slug)].map((cat) => (
            <button
              key={cat}
              onClick={() => router.push(`/consommateur/categorie/${encodeURIComponent(cat)}`)}
              className="tuile-cat"
            >
              <span className="emoji-cat">
                {emojiCategorie(cat, persos) ? (
                  <span style={{ fontSize: 24 }}>{emojiCategorie(cat, persos)}</span>
                ) : (
                  <PictoCategorie categorie={cat} size={24} />
                )}
              </span>
              <span className="text-aide text-center font-bold leading-tight">{libelleCategorie(cat, persos)}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Product showcase */}
      <div className="px-4 py-2 flex-1">
        {produitsPhares.length > 0 && (
          <div className="mb-4">
            <h2 className="text-titre titre-section mb-2">⭐ {t("march.phare")}</h2>
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4" style={{ scrollbarWidth: "none" }}>
              {produitsPhares.map((p) => (
                <CarteMboa key={p.id} className="card-produit !p-3 shrink-0" style={{ width: 190 }}>
                  <div className="zone-photo w-full h-24 rounded-xl flex items-center justify-center mb-2 overflow-hidden">
                    {p.emoji ? (
                      <span style={{ fontSize: 48 }} aria-hidden>{p.emoji}</span>
                    ) : p.photoReelle ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.photoReelle} alt={p.nom} className="w-full h-full object-cover" />
                    ) : (
                      <PictoCategorie categorie={p.categorie} size={48} />
                    )}
                  </div>
                  <h3 className="text-corps font-bold truncate">{p.nom}</h3>
                  {(() => {
                    const pct = promoPct(p);
                    return pct ? (
                      <p className="mt-1">
                        <span className="text-aide line-through mr-1" style={{ color: "var(--mboa-text-doux)" }}>{p.prix} F</span>
                        <span className="puce-prix" style={{ background: "var(--mboa-error)" }}>{Math.round(p.prix * (1 - pct / 100))} F -{pct} %</span>
                      </p>
                    ) : (
                      <p className="puce-prix mt-1 inline-block">{produitPrixLabel(p)}</p>
                    );
                  })()}
                  {!produitEstRupture(p) && (
                    <button
                      onClick={() => poserAuPanier(p)}
                      className="btn-mboa btn-primary w-full !min-h-[44px] !rounded-xl mt-2 font-bold"
                    >
                      + {t("march.ajouter")}
                    </button>
                  )}
                </CarteMboa>
              ))}
            </div>
          </div>
        )}
        <h2 className="text-titre titre-section mb-2">{t("march.tousProduits")}</h2>
        {produitsFiltres.length === 0 ? (
          <div className="etat-vide">
            <span className="emoji-vide">🥬</span>
            <p className="text-corps text-[var(--mboa-text-doux)]">{t("march.aucunProduit")}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {produitsFiltres.map((p) => (
              <CarteMboa key={p.id} className="card-produit !p-3">
                <div className="flex justify-between items-start mb-1">
                  <div className="flex items-center gap-1">
                    {p.emoji ?? <PictoCategorie categorie={p.categorie} size={24} />}
                    <h3 className="text-corps font-bold">{p.nom}</h3>
                    {estNouveau(p) && (
                      <span className="text-aide px-1.5 py-0.5 rounded-full font-bold" style={{ background: "var(--mboa-accent-doux)", color: "var(--mboa-primary)", fontSize: 11 }}>
                        {t("march.nouveau")}
                      </span>
                    )}
                  </div>
                  <BoutonVoix texte={produitAnnonceVocale(p, true)} />
                </div>

                {/* Photo or pictogram */}
                <div className="zone-photo w-full h-32 rounded-xl flex items-center justify-center mb-2 overflow-hidden">
                  {p.emoji ? (
                    <span style={{ fontSize: 64 }} aria-hidden>{p.emoji}</span>
                  ) : p.photoReelle ? (
                    <img src={p.photoReelle} alt={p.nom} className="w-full h-full object-cover rounded-xl" />
                  ) : (
                    <PictoCategorie categorie={p.categorie} size={64} />
                  )}
                </div>

                {/* Availability + gauge */}
                <p className="text-aide text-[var(--mboa-text-doux)] mb-1">
                  {produitEstRupture(p) ? t("march.rupture") : t("march.disponible")}
                </p>
                <JaugeMboa valeur={produitJauge(p)} />

                {/* Price + button */}
                <div className="flex justify-between items-center mt-2">
                  {(() => {
                    const pct = promoPct(p);
                    return pct ? (
                      <span className="flex flex-col items-end">
                        <span className="text-aide line-through" style={{ color: "var(--mboa-text-doux)" }}>
                          {p.prix} F
                        </span>
                        <span className="puce-prix" style={{ background: "var(--mboa-error)" }}>
                          {Math.round(p.prix * (1 - pct / 100))} F -{pct} %
                        </span>
                      </span>
                    ) : (
                      <span className="puce-prix">{produitPrixLabel(p)}</span>
                    );
                  })()}
                  {!produitEstRupture(p) && (
                    <button
                      onClick={() => poserAuPanier(p)}
                      className="btn-mboa btn-primary !min-h-[48px] !min-w-[48px] !rounded-xl text-2xl"
                      aria-label={t("march.ajouter")}
                    >
                      +
                    </button>
                  )}
                </div>
                {produitEstPack(p) && (
                  <Link
                    href={`/consommateur/pack/${encodeURIComponent(p.slug)}`}
                    className="block text-center text-aide text-[var(--mboa-primary)] font-bold mt-2 underline"
                  >
                    🍲 {t("pack.voir")}
                  </Link>
                )}
              </CarteMboa>
            ))}
          </div>
        )}
      </div>

      {/* Useful links */}
      <div className="px-4 py-2 flex gap-2">
        <Link href="/consommateur/liste" className="flex-1">
          <BoutonMboa variant="surface" className="w-full">📋 {t("march.liste")}</BoutonMboa>
        </Link>
        <Link href="/consommateur/suivi" className="flex-1">
          <BoutonMboa variant="surface" className="w-full">📦 {t("march.mesCommandes")}</BoutonMboa>
        </Link>
      </div>
      {onboarding && <OnboardingMboa onTermine={() => setOnboarding(false)} />}
    </FondMboa>
  );
}
