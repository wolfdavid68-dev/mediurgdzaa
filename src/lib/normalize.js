// Normalisation pour comparaison insensible casse + diacritiques.
// "Adrénaline" → "adrenaline", "Méthyl" → "methyl"
// Décompose en NFD puis supprime les marques diacritiques combinantes
// (U+0300 → U+036F).
export const normalize = (str) =>
  (str || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
