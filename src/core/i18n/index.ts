"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

/** Langues d'interface proposées. Le bassa/bamoun/pidgin restent réservés à la voix (TTS). */
export type Lang = "fr" | "en";

interface LangueState {
  langue: Lang;
  setLangue: (l: Lang) => void;
}

/** Langue choisie, persistée dans le navigateur. Défaut : français (Cameroun). */
export const useLangue = create<LangueState>()(
  persist(
    (set) => ({
      langue: "fr",
      setLangue: (langue) => set({ langue }),
    }),
    { name: "mboa-langue" },
  ),
);

const DICT: Record<Lang, Record<string, string>> = {
  fr: {
    // Commun
    "app.nom": "MBOA BIO 237",
    "app.slogan": "La terre nous nourrit, la qualité nous distingue",
    "app.village": "Bafoussam, Cameroun",

    // Choix de l'espace
    "choix.titre": "Quel espace ?",
    "choix.sousTitre": "Le comptoir vend. Le client achète. Le livreur livre.",
    "choix.note": "Le livreur reçoit son compte directement au comptoir MBOA.",
    "role.consommateur.nom": "MBOA BIO 237",
    "role.consommateur.desc": "Fruits, légumes et vivres frais,commandés depuis votre téléphone et livrés à votre porte.",
    "role.fournisseur.nom": "MBOA FOURNISSEUR",
    "role.fournisseur.desc": "Producteur ou commerçant : vendez votre récolte directement au comptoir, sans intermédiaire.",
    "role.livreur.nom": "MBOA LIVREUR",
    "role.livreur.desc": "En moto ou vélo : transportez les paniers des clients à travers la ville.",
    "role.admin.nom": "MBOA ADMIN",
    "role.admin.desc": "Le comptoir : gestion des stocks, validation des commandes et contrôle qualité.",
    "choix.rejoindre": "Vous vendez ? Devenez fournisseur",

    // Connexion
    "connex.titre": "Connexion",
    "connex.sousTitre": "Entrez avec votre téléphone ou votre email",
    "connex.idLabel": "Téléphone ou adresse email",
    "connex.idPlaceholder": "6XX XXX XXX ou email",
    "connex.mdpLabel": "Mot de passe",
    "connex.mdpPlaceholder": "••••••",
    "connex.btn": "Se connecter",
    "connex.btnCours": "Connexion…",
    "connex.switch": "Changer d'espace",
    "connex.sansCompte": "Pas encore de compte ? Créer mon compte",
    "connex.erreurMdp": "Mot de passe trop court",
    "connex.erreurMdpChiffre": "Le mot de passe doit contenir au moins un chiffre",
    "connex.erreurMdpPaire": "Les deux mots de passe ne correspondent pas",
    "connex.erreurIntrouvable": "Aucun compte avec cet identifiant. Créez votre compte.",
    "connex.erreurDesactive": "Ce compte est désactivé. Contactez le comptoir MBOA.",
    "connex.erreurMdpFaux": "Mot de passe incorrect",
    "connex.erreurGenerique": "Erreur de connexion",

    // Inscription
    "insc.titre": "Créer mon compte",
    "insc.sousTitre": "Client MBOA BIO — inscription rapide",
    "insc.parTel": "Téléphone",
    "insc.parMail": "Email",
    "insc.idLabel": "Votre téléphone ou email",
    "insc.nomLabel": "Votre nom",
    "insc.nomPlaceholder": "Ex : Maman Elise",
    "insc.villageLabel": "Votre village (facultatif)",
    "insc.villagePlaceholder": "Ex : Mbouda",
    "insc.mdpLabel": "Mot de passe",
    "insc.mdpPlaceholder": "6 caractères minimum, avec un chiffre",
    "insc.mdpConfirmLabel": "Confirmer le mot de passe",
    "insc.mdpConfirmPlaceholder": "Retapez le mot de passe",
    "insc.btn": "Créer mon compte",
    "insc.btnCours": "Création…",
    "insc.dejaCompte": "J'ai déjà un compte",
    "insc.erreurId": "Identifiant invalide",
    "insc.erreurNom": "Votre nom est requis",
    "insc.erreurCreation": "Erreur lors de la création du compte",
    "insc.erreurMdp": "Erreur lors du changement de mot de passe",

    // Changement de mot de passe forcé
    "mdp.titre": "Nouveau mot de passe",
    "mdp.sousTitreDefaut": "Première connexion sur cet appareil. Le mot de passe initial doit être changé.",
    "mdp.sousTitreAppareil": "Vous vous êtes connecté sur un nouvel appareil. Confirmez votre mot de passe.",
    "mdp.btn": "Confirmer",
    "mdp.btnCours": "Enregistrement…",
    "mdp.compteIntrouvable": "Compte introuvable",

    // Rejoindre (devenir fournisseur)
    "rej.titre": "Devenir fournisseur",
    "rej.sousTitre": "Dites-nous ce que vous avez, le comptoir achète",
    "rej.who": "Qui êtes-vous ?",
    "rej.nomPh": "Votre nom",
    "rej.telPh": "Téléphone (pour le paiement)",
    "rej.villagePh": "Votre village / ville",
    "rej.villageAutre": "Autre",
    "rej.produit": "Produit",
    "rej.nomProduitPh": "Nom du produit (ex : Manioc, Macabo, Porc…)",
    "rej.quantitePh": "Quantité",
    "rej.prixPh": "Prix demandé par unité (FCFA)",
    "rej.total": "Total :",
    "rej.photo": "Photo (recommandée)",
    "rej.photoAlt": "Marchandise",
    "rej.ajouter": "+ Ajouter un autre produit",
    "rej.noteLabel": "Note pour le comptoir (facultatif)",
    "rej.notePh": "Disponibilité, conditions de transport, périodes de récolte…",
    "rej.envoyer": "Envoyer ma déclaration",
    "rej.envoi": "Envoi…",
    "rej.dejaFournisseur": "Déjà fournisseur connecté ?",
    "rej.connecter": "Se connecter",
    "rej.succes.titre": "Déclaration envoyée",
    "rej.succes.texte": "Le comptoir Mboa Bio va étudier votre offre. Si elle est acceptée, vos marchandises entrent en stock et vous êtes payé à la livraison.",
    "rej.succes.btn": "Retour à l'accueil",
    "rej.erreur.nom": "Votre nom est requis",
    "rej.erreur.tel": "Numéro de téléphone invalide",
    "rej.erreur.village": "Votre village est requis",
    "rej.erreur.produitNom": "nom requis",
    "rej.erreur.produitPrix": "prix requis",
    "rej.erreur.generique": "Une erreur est survenue. Réessayez.",

    // Page marché (consommateur)
    "cat.fruit": "Fruits",
    "cat.tubercule": "Tubercules",
    "cat.legume": "Légumes & feuilles",
    "cat.cereale": "Céréales & graines",
    "cat.viande": "Viandes & œufs",
    "cat.poisson": "Poissons & mer",
    "cat.huile": "Huiles & condiments",
    "cat.boisson": "Boissons & laitages",
    "march.titre": "Le marché",
    "march.bonjour": "Bonjour",
    "march.enLigne": "En ligne",
    "march.horsLigne": "Hors ligne",
    "march.enAttente": "en attente d'envoi",
    "march.mesCommandes": "Mes commandes",
    "march.recherche": "🔍 Rechercher un produit...",
    "march.prixAsc": "Prix ↑",
    "march.prixDesc": "Prix ↓",
    "march.categories": "Catégories",
    "march.toutAfficher": "Tout afficher",
    "march.tousProduits": "Tous les produits",
    "march.aucunProduit": "Aucun produit disponible pour le moment",
    "march.liste": "Liste de marché",
    "march.ajouter": "Ajouter au panier",

    // Petits plus
    "plus.horsLigne": "Fonctionne sans internet",
    "plus.livraison": "Livraison à domicile",
    "plus.paiement": "Paiement à la livraison",
    "plus.frais": "Produits frais du village",
  },
  en: {
    // Commun
    "app.nom": "MBOA BIO 237",
    "app.slogan": "The earth feeds us, quality sets us apart",
    "app.village": "Bafoussam, Cameroon",

    // Choix de l'espace
    "choix.titre": "Which space?",
    "choix.sousTitre": "The counter sells. The customer buys. The driver delivers.",
    "choix.note": "The driver receives their account directly from the MBOA counter.",
    "role.consommateur.nom": "MBOA BIO 237",
    "role.consommateur.desc": "Fresh fruit, vegetables and staples, ordered from your phone and delivered to your door.",
    "role.fournisseur.nom": "MBOA SUPPLIER",
    "role.fournisseur.desc": "Farmer or trader: sell your harvest straight to the counter, no middleman.",
    "role.livreur.nom": "MBOA DRIVER",
    "role.livreur.desc": "By motorbike or bike: carry customers' baskets across the city.",
    "role.admin.nom": "MBOA ADMIN",
    "role.admin.desc": "The counter: stock management, order validation and quality control.",
    "choix.rejoindre": "Selling? Become a supplier",

    // Connexion
    "connex.titre": "Sign in",
    "connex.sousTitre": "Sign in with your phone or email",
    "connex.idLabel": "Phone or email address",
    "connex.idPlaceholder": "6XX XXX XXX or email",
    "connex.mdpLabel": "Password",
    "connex.mdpPlaceholder": "••••••",
    "connex.btn": "Sign in",
    "connex.btnCours": "Signing in…",
    "connex.switch": "Switch space",
    "connex.sansCompte": "No account yet? Create my account",
    "connex.erreurMdp": "Password is too short",
    "connex.erreurMdpChiffre": "Password must contain at least one digit",
    "connex.erreurMdpPaire": "The two passwords do not match",
    "connex.erreurIntrouvable": "No account with this ID. Create your account.",
    "connex.erreurDesactive": "This account is disabled. Contact the MBOA counter.",
    "connex.erreurMdpFaux": "Incorrect password",
    "connex.erreurGenerique": "Sign-in error",

    // Inscription
    "insc.titre": "Create my account",
    "insc.sousTitre": "MBOA BIO customer — quick sign-up",
    "insc.parTel": "Phone",
    "insc.parMail": "Email",
    "insc.idLabel": "Your phone or email",
    "insc.nomLabel": "Your name",
    "insc.nomPlaceholder": "E.g.: Mama Elise",
    "insc.villageLabel": "Your village (optional)",
    "insc.villagePlaceholder": "E.g.: Mbouda",
    "insc.mdpLabel": "Password",
    "insc.mdpPlaceholder": "6 characters minimum, with a digit",
    "insc.mdpConfirmLabel": "Confirm password",
    "insc.mdpConfirmPlaceholder": "Re-type the password",
    "insc.btn": "Create my account",
    "insc.btnCours": "Creating…",
    "insc.dejaCompte": "I already have an account",
    "insc.erreurId": "Invalid ID",
    "insc.erreurNom": "Your name is required",
    "insc.erreurCreation": "Error creating the account",
    "insc.erreurMdp": "Error while changing password",

    // Changement de mot de passe forcé
    "mdp.titre": "New password",
    "mdp.sousTitreDefaut": "First sign-in on this device. The initial password must be changed.",
    "mdp.sousTitreAppareil": "You signed in on a new device. Confirm your password.",
    "mdp.btn": "Confirm",
    "mdp.btnCours": "Saving…",
    "mdp.compteIntrouvable": "Account not found",

    // Rejoindre (devenir fournisseur)
    "rej.titre": "Become a supplier",
    "rej.sousTitre": "Tell us what you have, the counter buys",
    "rej.who": "Who are you?",
    "rej.nomPh": "Your name",
    "rej.telPh": "Phone (for payment)",
    "rej.villagePh": "Your village / town",
    "rej.villageAutre": "Other",
    "rej.produit": "Product",
    "rej.nomProduitPh": "Product name (e.g.: Cassava, Macabo, Pork…)",
    "rej.quantitePh": "Quantity",
    "rej.prixPh": "Asking price per unit (FCFA)",
    "rej.total": "Total:",
    "rej.photo": "Photo (recommended)",
    "rej.photoAlt": "Goods",
    "rej.ajouter": "+ Add another product",
    "rej.noteLabel": "Note for the counter (optional)",
    "rej.notePh": "Availability, transport conditions, harvest periods…",
    "rej.envoyer": "Send my declaration",
    "rej.envoi": "Sending…",
    "rej.dejaFournisseur": "Already a connected supplier?",
    "rej.connecter": "Sign in",
    "rej.succes.titre": "Declaration sent",
    "rej.succes.texte": "The Mboa Bio counter will review your offer. If accepted, your goods enter stock and you are paid on delivery.",
    "rej.succes.btn": "Back to home",
    "rej.erreur.nom": "Your name is required",
    "rej.erreur.tel": "Invalid phone number",
    "rej.erreur.village": "Your village is required",
    "rej.erreur.produitNom": "name required",
    "rej.erreur.produitPrix": "price required",
    "rej.erreur.generique": "An error occurred. Please try again.",

    // Page marché (consommateur)
    "cat.fruit": "Fruits",
    "cat.tubercule": "Tubers",
    "cat.legume": "Vegetables & greens",
    "cat.cereale": "Grains & seeds",
    "cat.viande": "Meat & eggs",
    "cat.poisson": "Fish & seafood",
    "cat.huile": "Oils & condiments",
    "cat.boisson": "Drinks & dairy",
    "march.titre": "The market",
    "march.bonjour": "Hello",
    "march.enLigne": "Online",
    "march.horsLigne": "Offline",
    "march.enAttente": "waiting to send",
    "march.mesCommandes": "My orders",
    "march.recherche": "🔍 Search for a product...",
    "march.prixAsc": "Price ↑",
    "march.prixDesc": "Price ↓",
    "march.categories": "Categories",
    "march.toutAfficher": "Show all",
    "march.tousProduits": "All products",
    "march.aucunProduit": "No products available right now",
    "march.liste": "Market list",
    "march.ajouter": "Add to cart",

    // Petits plus
    "plus.horsLigne": "Works offline",
    "plus.livraison": "Home delivery",
    "plus.paiement": "Pay on delivery",
    "plus.frais": "Fresh from the village",
  },
};

/** Traduit une clé ; retombe sur l'anglais puis sur la clé elle-même. */
export function useTr(): (cle: string) => string {
  const langue = useLangue((s) => s.langue);
  return (cle: string) => DICT[langue][cle] ?? DICT.en[cle] ?? cle;
}

/** Libellé de catégorie traduit selon la langue choisie. */
export function useCategorieLibelle(): (categorie: string) => string {
  const t = useTr();
  return (categorie: string) => t(`cat.${categorie}`);
}
