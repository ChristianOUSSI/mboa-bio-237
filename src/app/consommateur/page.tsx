"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession, usePanier, useData, useReseau } from "@/core/etat/store";
import { chargerVitrine, chargerCatalogue, commandesCliente, compterFile } from "@/core/data/depots";
import { CarteMboa, JaugeMboa, PictoCategorie, BoutonVoix, EnTetePage, BoutonMboa, FondMboa, SkeletonMboa } from "@/core/design_system/composants";
import { CATEGORIES_ORDREES, CATEGORIE_INFO, Categorie } from "@/core/types/categorie";
import { Produit, produitAnnonceVocale, produitDisponibilite, produitPrixLabel, produitJauge, produitEstRupture, produitUniteReelle, produitEstVitrine } from "@/core/types/produit";
import { Commande } from "@/core/types/commande_full";
import { useGuardRole } from "@/core/auth/use_guard_role";

export default function MarchePage() {
  const router = useRouter();
  const { pret, profil } = useGuardRole("consommateur");
  const { deconnexion } = useSession();
  const panier = usePanier();
  const { vitrine, catalogue, setVitrine, setCatalogue } = useData();
  const { enLigne, fileAttente, setEnLigne, setFileAttente } = useReseau();
  const [categorieChoisie, setCategorieChoisie] = useState<Categorie | null>(null);
  const [commandes, setCommandes] = useState<Commande[]>([]);
  const [recherche, setRecherche] = useState("");
  const [tri, setTri] = useState<"nom" | "prix_asc" | "prix_desc">("nom");

  useEffect(() => {
    async function charger() {
      const [v, c] = await Promise.all([chargerVitrine(), chargerCatalogue()]);
      // The customer only sees real stock: active and quantity > 0
      setVitrine(v.filter(produitEstVitrine));
      setCatalogue(c);
      if (profil) {
        const cmds = await commandesCliente(profil.id);
        setCommandes(cmds);
      }
      const compte = await compterFile();
      setFileAttente(compte);
    }
    charger();
  }, [profil, setVitrine, setCatalogue, setFileAttente]);

  useEffect(() => {
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
          <SkeletonMboa lignes={6} />
        </div>
      </FondMboa>
    );
  }

  const produitsFiltres = (categorieChoisie
    ? vitrine.filter((p) => p.categorie === categorieChoisie)
    : vitrine
  ).filter((p) =>
    !recherche.trim() || p.nom.toLowerCase().includes(recherche.toLowerCase())
  ).sort((a, b) => {
    if (tri === "prix_asc") return a.prix - b.prix;
    if (tri === "prix_desc") return b.prix - a.prix;
    return a.nom.localeCompare(b.nom);
  });

  function poserAuPanier(produit: Produit) {
    const u = produitUniteReelle(produit);
    panier.poser({
      produitId: produit.id,
      slug: produit.slug,
      nom: produit.nom,
      categorie: produit.categorie,
      quantite: 1,
      prix: produit.prix,
      coutAchat: produit.prixAchat ?? 0,
      photo: produit.photoReelle,
      unite: u,
      composants: produit.composants,
    });
  }

  return (
    <FondMboa>
      <EnTetePage
        titre="The market"
        sousTitre={profil ? `Hello ${profil.nom}` : "MBOA BIO 237"}
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
              <span className="absolute -top-1 -right-1 bg-[var(--mboa-error)] text-white rounded-full w-6 h-6 flex items-center justify-center text-aide font-bold">
                {panier.compte()}
              </span>
            )}
          </Link>
        }
      />

      {/* Network indicator */}
      <div className={`px-4 py-1 text-center text-aide ${enLigne ? "text-[var(--mboa-primary)]" : "text-[var(--mboa-error)]"}`}>
        {enLigne ? "● Online" : "● Offline"}{fileAttente > 0 ? ` · ${fileAttente} waiting to send` : ""}
      </div>

      {/* My orders */}
      {commandes.length > 0 && (
        <div className="px-4 py-2">
          <Link href="/consommateur/suivi">
            <CarteMboa className="flex items-center justify-between">
              <span className="text-corps">My orders</span>
              <span className="text-aide text-[var(--mboa-primary)] font-bold">{commandes.length} →</span>
            </CarteMboa>
          </Link>
        </div>
      )}

      {/* Search + sort */}
      <div className="px-4 py-2">
        <input
          type="text"
          placeholder="🔍 Search for a product..."
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          className="w-full p-2 border-2 border-[var(--mboa-primary)] rounded-xl mb-2"
          style={{ fontSize: 16 }}
        />
        <div className="flex gap-2">
          {([["nom", "A-Z"], ["prix_asc", "Price ↑"], ["prix_desc", "Price ↓"]] as const).map(([v, label]) => (
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

      {/* 8-category grid */}
      <div className="px-4 py-2">
        <h2 className="text-titre mb-2">Categories</h2>
        <div className="grid grid-cols-4 gap-2">
          {CATEGORIES_ORDREES.map((cat) => {
            const info = CATEGORIE_INFO[cat];
            const estChoisie = categorieChoisie === cat;
            return (
              <button
                key={cat}
                onClick={() => setCategorieChoisie(estChoisie ? null : cat)}
                className={`flex flex-col items-center justify-center p-2 rounded-xl border-2 transition-all`}
                style={{
                  minHeight: 72,
                  borderColor: estChoisie ? "var(--mboa-primary)" : "transparent",
                  background: estChoisie ? "var(--mboa-secondary-doux)" : "var(--mboa-surface)",
                }}
              >
                <PictoCategorie categorie={cat} size={32} />
                <span className="text-aide mt-1 text-center font-bold">{info.libelle}</span>
              </button>
            );
          })}
        </div>
        {categorieChoisie && (
          <button
            onClick={() => setCategorieChoisie(null)}
            className="text-aide text-[var(--mboa-primary)] mt-1 underline"
          >
            Show all
          </button>
        )}
      </div>

      {/* Product showcase */}
      <div className="px-4 py-2 flex-1">
        <h2 className="text-titre mb-2">
          {categorieChoisie ? CATEGORIE_INFO[categorieChoisie].libelle : "All products"}
        </h2>
        {produitsFiltres.length === 0 ? (
          <CarteMboa className="text-center">
            <p className="text-corps text-[var(--mboa-text-doux)]">No products available right now</p>
          </CarteMboa>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {produitsFiltres.map((p) => (
              <CarteMboa key={p.id}>
                <div className="flex justify-between items-start mb-1">
                  <div className="flex items-center gap-1">
                    <PictoCategorie categorie={p.categorie} size={24} />
                    <h3 className="text-corps font-bold">{p.nom}</h3>
                  </div>
                  <BoutonVoix texte={produitAnnonceVocale(p)} />
                </div>

                {/* Photo or pictogram */}
                <div className="w-full h-32 bg-[var(--mboa-background)] rounded-xl flex items-center justify-center mb-2">
                  {p.photoReelle ? (
                    <img src={p.photoReelle} alt={p.nom} className="w-full h-full object-cover rounded-xl" />
                  ) : (
                    <PictoCategorie categorie={p.categorie} size={64} />
                  )}
                </div>

                {/* Availability + gauge */}
                <p className="text-aide text-[var(--mboa-text-doux)] mb-1">
                  {produitDisponibilite(p)}
                </p>
                <JaugeMboa valeur={produitJauge(p)} />

                {/* Price + button */}
                <div className="flex justify-between items-center mt-2">
                  <span className="text-chiffre text-[var(--mboa-primary)]">
                    {produitPrixLabel(p)}
                  </span>
                  {!produitEstRupture(p) && (
                    <button
                      onClick={() => poserAuPanier(p)}
                      className="btn-mboa btn-primary !min-h-[48px] !min-w-[48px] !rounded-xl text-2xl"
                      aria-label="Add to cart"
                    >
                      +
                    </button>
                  )}
                </div>
              </CarteMboa>
            ))}
          </div>
        )}
      </div>

      {/* Useful links */}
      <div className="px-4 py-2 flex gap-2">
        <Link href="/consommateur/liste" className="flex-1">
          <BoutonMboa variant="surface" className="w-full">📋 Market list</BoutonMboa>
        </Link>
        <Link href="/consommateur/suivi" className="flex-1">
          <BoutonMboa variant="surface" className="w-full">📦 My orders</BoutonMboa>
        </Link>
      </div>
    </FondMboa>
  );
}
