# MBOA BIO 237 - Version PWA (Next.js)

Comptoir vivrier ultra-accessible pour le Cameroun. Une codebase, quatre rôles.
Portage du projet Flutter original vers une PWA Next.js + TypeScript.

## Stack

- **Next.js 16** (App Router, Turbopack)
- **TypeScript** strict
- **Tailwind CSS v4** avec design system MBOA (6 couleurs)
- **Zustand** pour la gestion d'état (session, panier, liste, réseau)
- **Supabase JS** pour l'auth OTP et les données (optionnel)
- **IndexedDB** pour le cache offline-first
- **Service Worker** PWA installable
- **Web Speech API** (TTS) pour l'accessibilité voix-first

## Structure

```
src/
  app/                          # Pages Next.js (App Router)
    page.tsx                    # Splash → redirection
    connexion/page.tsx          # Auth OTP (téléphone → code 4 chiffres)
    consommateur/               # Rôle cliente
      page.tsx                  # Le marché (vitrine, 8 catégories)
      panier/page.tsx           # Panier + validation commande
      liste/page.tsx            # Liste de marché + code dictable
      suivi/page.tsx            # Suivi colis (timeline 5 jalons)
    fournisseur/                # Rôle producteur
      page.tsx                  # Accueil (gains, 3 boutons)
      proposer/page.tsx         # Vendre récolte (photo, catégorie, prix)
      achats/page.tsx           # Mes achats (statuts)
      stock/page.tsx            # Stock au comptoir (lecture seule)
    admin/                      # Rôle comptoir
      page.tsx                  # Tableau de bord (compteurs)
      achats/page.tsx           # File des achats (signer/refuser)
      stock/page.tsx            # Stock complet + marges
      devis/page.tsx            # Tous les devis
      livraisons/page.tsx       # À pointer
      fournisseurs/page.tsx     # Fichier fournisseurs
      livreurs/page.tsx         # Fichier livreurs
      bilan/page.tsx            # Bilan (marge, écart)
    livreur/page.tsx            # Rôle moto (courses du jour)
    layout.tsx                  # Layout racine (PWA, Nunito)
    globals.css                 # Design system MBOA
    sw-register.tsx             # Service Worker
  core/
    config/app_env.ts           # Config Supabase + rôles
    types/                      # Modèles (miroir des modèles Dart)
      categorie.ts              # 8 catégories du catalogue
      unite.ts                  # 11 unités de mesure
      achat.ts                  # Proposition d'achat + 5 statuts
      statuts.ts                # Statuts commande, paiement, satisfaction
      pack_composant.ts         # Composants d'un plat préparé
      commande.ts               # Ligne de commande + helpers
      commande_full.ts          # Commande complète + calculs
      produit.ts                # Fiche stock + jauges + marges
      profil.ts                 # Profil utilisateur
      fournisseur.ts            # Fiche producteur
      livreur.ts                # Fiche livreur + course
      suivi_colis.ts            # Timeline 5 jalons
      catalogue.ts              # Entrée catalogue + paliers
      liste.ts                  # Liste de marché + code dictable
      langue.ts                 # 4 langues
    utils/
      format_monnaie.ts         # Formatage FCFA
      identifiants.ts           # UUID, slug, téléphone 237
    voice/tts_service.ts        # Text-to-Speech
    data/
      mboa_reseau.ts            # Wrapper Supabase
      base_locale.ts            # Cache IndexedDB (3 stores)
      catalogue_hors_ligne.ts   # 34 références du catalogue seed
      depots.ts                 # Repositories (produits, commandes, auth, etc.)
    etat/store.ts               # Zustand stores (session, panier, liste, réseau, données)
    design_system/composants.tsx # BoutonMboa, CarteMboa, JaugeMboa, etc.
public/
  manifest.json                 # PWA manifest
  sw.js                         # Service Worker offline-first
  icon.svg                      # Icône PWA
```

## Démarrage

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # build production
```

## Configuration Supabase (optionnel)

Sans Supabase, l'app fonctionne en mode démonstration :
- Données en cache local (IndexedDB)
- Auth par code vocal (TTS du navigateur)
- Catalogue hors-ligne (34 références)

Pour connecter Supabase, remplir `.env.local` :

```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx
```

## Charte MBOA BIO 237

6 couleurs, aucune autre :

| Couleur | Hex | Usage |
|---------|-----|-------|
| Vert foncé | `#1E5128` | Primaire (surfaces sombres, texte, icônes) |
| Vert clair | `#8BC34A` | Décoration (jauge, halo) - interdit comme texte |
| Beige | `#F8F9E9` | Fond général |
| Blanc | `#FFFFFF` | Surface des cartes |
| Rouge | `#D32F2F` | Erreur et litige |
| Noir | `#212121` | Texte |

- Cible tactile minimale : 72px
- Taille de texte minimale : 18px
- Police : Nunito (variable, 200-1000)
- Coins arrondis : 20px

## Rôles

| Rôle | App | Accueil |
|------|-----|---------|
| Consommateur | MBOA BIO 237 | Le marché (vitrine) |
| Fournisseur | MBOA FOURNISSEUR | Gains + vendre récolte |
| Admin | MBOA ADMIN | Tableau de bord (comptoir) |
| Livreur | MBOA LIVREUR | Courses du jour |
