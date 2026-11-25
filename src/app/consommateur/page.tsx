"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession, usePanier, useData, useReseau, toast, clePanier } from "@/core/etat/store";
import { chargerVitrine, chargerCatalogue, commandesCliente, compterFile } from "@/core/data/depots";
import { CarteMboa, JaugeMboa, PictoCategorie, BoutonVoix, EnTetePage, BoutonMboa, FondMboa, SkeletonMboa, ChargementMboa } from "@/core/design_system/composants";
import { CATEGORIES_ORDREES } from "@/core/types/categorie";
import { categoriesPerso, libelleCategorie, emojiCategorie, CategoriePerso } from "@/core/data/categories";
import { Produit, produitAnnonceVocale, produitDisponibilite, produitPrixLabel, produitJauge, produitEstRupture, produitEstVitrine, produitEstPack, produitUnites } from "@/core/types/produit";
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

/** Sélecteur de quantité sur la fiche produit : on tape la quantité
 *  souhaitée (ex. 30, 20) au lieu de taper + une par une. */
function BlocQuantite({ produit, promoPct, t }: { produit: Produit; promoPct: (p: Produit) => number | null; t: (k: string) => string }) {
  const panier = usePanier();
  const [qte, setQte] = useState(1);
  // Multi-unités : le client choisit kg / pièce / sac… et voit le prix
  // de l'unité sélectionnée avant d'ajouter.
  const unites = produitUnites(produit);
  const [uniteIdx, setUniteIdx] = useState(0);
  const uniteChoisie = unites[Math.min(uniteIdx, unites.length - 1)];
  const enPanier = panier.lignes
    .filter((l) => l.produitId === produit.id && l.unite === uniteChoisie.unite)
    .reduce((s, l) => s + l.quantite, 0);
  const cle = clePanier(produit.id, uniteChoisie.unite);

  function ajouter() {
    const n = Math.max(1, Math.floor(qte) || 1);
    const pct = promoPct(produit) ?? 0;
    const prix = pct ? Math.round(uniteChoisie.prix * (1 - pct / 100)) : uniteChoisie.prix;
    panier.poser({
      produitId: produit.id,
      slug: produit.slug,
      nom: produit.nom,
      categorie: produit.categorie,
      quantite: n,
      prix,
      coutAchat: produit.prixAchat ?? 0,
      photo: produit.photoReelle,
      unite: uniteChoisie.unite,
      composants: produit.composants,
    });
    vibrer();
    toast(`${produit.nom} ×${n} ${uniteChoisie.unite} ${t("toast.ajoute")}`);
    setQte(1);
  }

  const pucesUnites = unites.length > 1 && (
    <div className="flex flex-wrap gap-1.5 mb-1.5" role="radiogroup" aria-label={t("march.uniteChoisir")}>
      {unites.map((u, i) => {
        const actif = i === Math.min(uniteIdx, unites.length - 1);
        return (
          <button
            key={u.unite}
            type="button"
            role="radio"
            aria-checked={actif}
            onClick={() => { setUniteIdx(i); setQte(1); }}
            className="px-3 py-1.5 rounded-full text-aide font-bold border-2 transition-colors"
            style={{
              borderColor: actif ? "var(--mboa-primary)" : "var(--mboa-border)",
              background: actif ? "var(--mboa-secondary-doux)" : "var(--mboa-surface)",
              color: actif ? "var(--mboa-primary)" : "var(--mboa-text-doux)",
            }}
          >
            {u.unite} · {u.prix.toLocaleString("fr-FR")} F
          </button>
        );
      })}
    </div>
  );

  if (enPanier > 0) {
    return (
      <div className="mt-2">
        {pucesUnites}
        <div className="flex items-center justify-between gap-1">
        <div className="flex items-center gap-1">
          <button
            onClick={() => panier.ajuster(cle, enPanier - 1)}
            className="btn-mboa btn-surface !min-h-[40px] !min-w-[40px] !rounded-xl text-xl"
            aria-label={`Moins de ${produit.nom}`}
          >
            −
          </button>
          <span className="text-corps font-bold min-w-[28px] text-center">{enPanier}</span>
          <button
            onClick={() => panier.ajuster(cle, enPanier + 1)}
            className="btn-mboa btn-secondary !min-h-[40px] !min-w-[40px] !rounded-xl text-xl"
            aria-label={`Plus de ${produit.nom}`}
          >
            +
          </button>
        </div>
        <button
          onClick={ajouter}
          className="btn-mboa btn-primary !min-h-[40px] !rounded-xl px-3 text-aide font-bold"
        >
          +{t("march.ajouter")}
        </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-2">
      {pucesUnites}
      <div className="flex items-center gap-1.5">
      <input
        type="number"
        inputMode="numeric"
        min={1}
        value={qte}
        onChange={(e) => setQte(Math.max(1, parseInt(e.target.value) || 1))}
        className="champ-mboa !min-h-[44px] !w-16 text-center text-corps font-bold"
        aria-label={t("march.quantite")}
      />
      <button
        onClick={ajouter}
        className="btn-mboa btn-primary flex-1 !min-h-[44px] !rounded-xl text-aide font-bold"
      >
        + {t("march.ajouter")}
      </button>
      </div>
    </div>
  );
}

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
  const [monterVisible, setMonterVisible] = useState(false);
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
    const surScroll = () => setMonterVisible(window.scrollY > 500);
    surScroll();
    window.addEventListener("online", handler);
    window.addEventListener("offline", handler);
    window.addEventListener("scroll", surScroll, { passive: true });
    return () => {
      window.removeEventListener("online", handler);
      window.removeEventListener("offline", handler);
      window.removeEventListener("scroll", surScroll);
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
                      <img src={p.photoReelle} alt={p.nom} loading="lazy" decoding="async" className="w-full h-full object-cover" />
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
                    <BlocQuantite produit={p} promoPct={promoPct} t={t} />
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
                    <img src={p.photoReelle} alt={p.nom} loading="lazy" decoding="async" className="w-full h-full object-cover rounded-xl" />
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
                </div>
                {!produitEstRupture(p) && (
                  <BlocQuantite produit={p} promoPct={promoPct} t={t} />
                )}
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
      {monterVisible && (
        <button
          type="button"
          aria-label={t("march.retourHaut")}
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed z-40 w-12 h-12 rounded-full shadow-lg flex items-center justify-center text-lg transition-transform active:scale-90"
          style={{
            bottom: "calc(1.25rem + env(safe-area-inset-bottom, 0px))",
            right: "1rem",
            background: "var(--mboa-primary)",
            color: "#fff",
          }}
        >
          ↑
        </button>
      )}
      {onboarding && <OnboardingMboa onTermine={() => setOnboarding(false)} />}
    </FondMboa>
  );
}
