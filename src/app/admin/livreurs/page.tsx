"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { chargerLivreurs, sauverLivreur } from "@/core/data/depots";
import { CarteMboa, EnTetePage, BoutonVoix, BoutonMboa, FondMboa, SkeletonMboa } from "@/core/design_system/composants";
import { Livreur, livreurRepere } from "@/core/types/livreur";
import { creerCompte } from "@/core/auth/auth_service";
import { validerMotDePasse } from "@/core/auth/auth_local";
import { useGuardRole } from "@/core/auth/use_guard_role";

interface FormulaireLivreur {
  nom: string;
  telephone: string;
  zone: string;
  moto: string;
  plaque: string;
  tarifCourse: string;
}

const FORMULAIRE_VIDE: FormulaireLivreur = {
  nom: "",
  telephone: "",
  zone: "",
  moto: "",
  plaque: "",
  tarifCourse: "500",
};

export default function LivreursAdminPage() {
  const router = useRouter();
  const { pret, profil } = useGuardRole("admin");
  const [livreurs, setLivreurs] = useState<Livreur[]>([]);
  const [form, setForm] = useState<FormulaireLivreur>(FORMULAIRE_VIDE);
  const [mdpGenere, setMdpGenere] = useState<{ nom: string; telephone: string; mdp: string } | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);
  const [modeCreation, setModeCreation] = useState(false);

  async function charger() {
    setLivreurs(await chargerLivreurs());
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    charger();
  }, []);

  /**
   * L'admin crée la fiche livreur ET son compte de connexion.
   * Le livreur n'a pas d'inscription libre : il reçoit ses identifiants.
   */
  async function creerLivreur() {
    setErreur(null);
    if (form.nom.trim().length === 0) {
      setErreur("The driver name is required");
      return;
    }
    if (form.telephone.replace(/\D/g, "").length < 9) {
      setErreur("Invalid phone number");
      return;
    }
    if (form.zone.trim().length === 0) {
      setErreur("The coverage area is required");
      return;
    }
    const tarif = parseInt(form.tarifCourse) || 0;

    setEnCours(true);
    try {
      await sauverLivreur({
        nom: form.nom.trim(),
        telephone: form.telephone.replace(/\D/g, ""),
        zone: form.zone.trim(),
        moto: form.moto.trim() || null,
        plaque: form.plaque.trim() || null,
        tarifCourse: tarif,
      });

      // Mot de passe provisoire, communiqué au livreur par le comptoir
      const mdp = `mboa${Math.floor(1000 + Math.random() * 9000)}`;
      const err = validerMotDePasse(mdp);
      if (err.ok) {
        const compte = await creerCompte({
          role: "livreur",
          nom: form.nom.trim(),
          telephone: form.telephone.replace(/\D/g, ""),
          email: null,
          village: form.zone.trim(),
          motDePasse: mdp,
        });
        setMdpGenere({
          nom: compte.nom,
          telephone: form.telephone.replace(/\D/g, ""),
          mdp,
        });
      }

      setForm(FORMULAIRE_VIDE);
      await charger();
    } catch (e) {
      console.error(e);
      setErreur("Error while creating the driver");
    } finally {
      setEnCours(false);
    }
  }

  if (!pret) {
    return (
      <FondMboa>
        <div className="flex-1 p-4">
          <SkeletonMboa lignes={6} />
        </div>
      </FondMboa>
    );
  }
  return (
    <FondMboa>
      <EnTetePage
        titre="Drivers"
        sousTitre="The counter creates driver accounts"
        onRetour={() => router.back()}
      />

      <div className="flex-1 p-4 space-y-3">
        {/* Identifiants générés */}
        {mdpGenere && (
          <CarteMboa className="card-accent bg-[var(--mboa-secondary-doux)] anim-apparition">
            <p className="text-corps font-bold text-[var(--mboa-primary)] mb-1">
              🔑 Credentials for {mdpGenere.nom}
            </p>
            <p className="text-aide">Phone: +{mdpGenere.telephone}</p>
            <p className="text-aide">Password: {mdpGenere.mdp}</p>
            <p className="text-aide text-[var(--mboa-text-doux)] mt-1">
              Give these credentials to the driver. They will change them at first sign-in.
            </p>
            <button
              onClick={() => setMdpGenere(null)}
              className="text-aide text-[var(--mboa-primary)] underline mt-2"
            >
              Close
            </button>
          </CarteMboa>
        )}

        {/* Bouton création */}
        <BoutonMboa
          variant={modeCreation ? "surface" : "primary"}
          onClick={() => setModeCreation(!modeCreation)}
          className="w-full"
        >
          {modeCreation ? "Cancel creation" : "🛵 Create a driver"}
        </BoutonMboa>

        {/* Formulaire de création */}
        {modeCreation && (
          <CarteMboa className="anim-apparition">
            <h2 className="text-titre mb-3">New driver</h2>

            <label className="text-aide block mb-1">Full name</label>
            <input
              type="text"
              placeholder="E.g.: Moto Moussa"
              value={form.nom}
              onChange={(e) => setForm({ ...form, nom: e.target.value })}
              className="champ-mboa mb-3"
              style={{ fontSize: 20 }}
            />

            <label className="text-aide block mb-1">Phone</label>
            <input
              type="tel"
              inputMode="numeric"
              placeholder="6XX XXX XXX"
              value={form.telephone}
              onChange={(e) => setForm({ ...form, telephone: e.target.value })}
              className="champ-mboa mb-3"
              style={{ fontSize: 20 }}
            />

            <label className="text-aide block mb-1">Coverage area</label>
            <input
              type="text"
              placeholder="E.g.: Mbouda and surroundings"
              value={form.zone}
              onChange={(e) => setForm({ ...form, zone: e.target.value })}
              className="champ-mboa mb-3"
              style={{ fontSize: 20 }}
            />

            <div className="grid grid-cols-2 gap-2 mb-3">
              <div>
                <label className="text-aide block mb-1">Bike (optional)</label>
                <input
                  type="text"
                  placeholder="E.g.: Honda"
                  value={form.moto}
                  onChange={(e) => setForm({ ...form, moto: e.target.value })}
                  className="champ-mboa"
                  style={{ fontSize: 18 }}
                />
              </div>
              <div>
                <label className="text-aide block mb-1">Plate (optional)</label>
                <input
                  type="text"
                  placeholder="E.g.: LT 456 AB"
                  value={form.plaque}
                  onChange={(e) => setForm({ ...form, plaque: e.target.value })}
                  className="champ-mboa"
                  style={{ fontSize: 18 }}
                />
              </div>
            </div>

            <label className="text-aide block mb-1">Delivery fee per run (FCFA)</label>
            <input
              type="number"
              inputMode="numeric"
              placeholder="500"
              value={form.tarifCourse}
              onChange={(e) => setForm({ ...form, tarifCourse: e.target.value })}
              className="champ-mboa mb-3"
              style={{ fontSize: 22 }}
            />

            {erreur && (
              <p className="text-[var(--mboa-error)] text-aide mb-2 text-center anim-secousse">
                {erreur}
              </p>
            )}

            <BoutonMboa onClick={creerLivreur} disabled={enCours} className="w-full">
              {enCours ? "Creating..." : "Create the driver and their credentials"}
            </BoutonMboa>
          </CarteMboa>
        )}

        {/* Liste des livreurs */}
        {livreurs.length === 0 && !modeCreation && (
          <CarteMboa>
            <p className="text-corps text-[var(--mboa-text-doux)] text-center">
              No drivers registered. Create the first one to start deliveries.
            </p>
          </CarteMboa>
        )}
        {livreurs.map((l, i) => (
          <CarteMboa key={l.id} className="anim-apparition" style={{ animationDelay: `${Math.min(i, 6) * 0.05}s` }}>
            <div className="flex justify-between items-start">
              <div>
                <span className="text-corps font-bold">{l.nom}</span>
                <p className="text-aide text-[var(--mboa-text-doux)]">Area: {l.zone}</p>
                <p className="text-aide text-[var(--mboa-text-doux)]">Marker: {livreurRepere(l)}</p>
                {l.telephone && (
                  <p className="text-aide text-[var(--mboa-text-doux)]">Phone: {l.telephone}</p>
                )}
                {l.plaque && (
                  <p className="text-aide text-[var(--mboa-text-doux)]">Plate: {l.plaque}</p>
                )}
                {l.tarifCourse > 0 && (
                  <p className="text-aide text-[var(--mboa-text-doux)]">Fee: {l.tarifCourse} F</p>
                )}
              </div>
              <BoutonVoix texte={`${l.nom}, de ${l.zone}. Marker: ${livreurRepere(l)}`} />
            </div>
          </CarteMboa>
        ))}
      </div>
    </FondMboa>
  );
}
