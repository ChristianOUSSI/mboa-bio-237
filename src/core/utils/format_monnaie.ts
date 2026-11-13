/**
 * 1 250 -> « 1 250 FCFA », avec une espace insécable entre les milliers.
 */
export function formaterFcfa(montant: number): string {
  return `${groupes(montant)} FCFA`;
}

/** 1 250 -> « 1 250 F », la forme courte utilisée dans les tuiles. */
export function formaterFcfaCourt(montant: number): string {
  return `${groupes(montant)} F`;
}

function groupes(montant: number): string {
  const chiffres = Math.abs(montant).toString();
  const tampons: string[] = [];
  for (let i = chiffres.length; i > 0; i -= 3) {
    const debut = Math.max(0, i - 3);
    tampons.unshift(chiffres.substring(debut, i));
  }
  // U+00A0 : espace insécable.
  const joint = tampons.join("\u00A0");
  return montant < 0 ? `-${joint}` : joint;
}

/** 2.0 -> « 2 », 2.5 -> « 2,5 ». */
export function formaterKg(kg: number): string {
  const arrondi = Math.round(kg);
  const texte =
    Math.abs(kg - arrondi) < 0.01
      ? arrondi.toString()
      : kg.toFixed(1);
  return texte.replace(".", ",");
}
