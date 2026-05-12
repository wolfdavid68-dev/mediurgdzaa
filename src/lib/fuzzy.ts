// Recherche tolérante aux fautes de frappe pour la barre de recherche.
//
// Strategy : substring exact d'abord (rapide, cas commun) ; en fallback, on
// compare la requête à chaque mot du champ via la distance de Levenshtein.
// Tolérance adaptative — pas de fuzzy sur les requêtes très courtes (trop
// de faux positifs) :
//   - q.length < 4 → substring uniquement
//   - q.length 4-5 → Levenshtein ≤ 1
//   - q.length ≥ 6 → Levenshtein ≤ 2
//
// Permet de retrouver « amidaron » (typo pour amiodarone), « adrenalin » sans
// le e final, « atropin », etc. Critique en stress : taper vite et juste,
// pas besoin d'orthographier parfaitement.

// Distance d'édition entre deux chaînes (algo DP classique, 2 lignes au lieu
// d'une matrice complète → O(min(m,n)) mémoire).
export const levenshtein = (a: string, b: string): number => {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  let prev: number[] = Array.from({ length: b.length + 1 }, (_, i) => i);
  let curr: number[] = Array.from({ length: b.length + 1 }, () => 0);

  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        prev[j] + 1, // deletion
        curr[j - 1] + 1, // insertion
        prev[j - 1] + cost // substitution
      );
    }
    [prev, curr] = [curr, prev];
  }

  return prev[b.length];
};

const fuzzyTolerance = (qLen: number): number => {
  if (qLen < 4) return 0;
  if (qLen < 6) return 1;
  return 2;
};

// Match `q` dans `field` : substring d'abord, puis fuzzy par mot.
// Les deux arguments doivent déjà être normalisés (lowercase, sans accents).
export const fuzzyIncludes = (field: string, q: string): boolean => {
  if (!q) return true;
  if (field.includes(q)) return true;

  const tol = fuzzyTolerance(q.length);
  if (tol === 0) return false;

  // Split sur séparateurs courants (espaces, tirets, ponctuation). Garde les
  // mots ≥ 3 chars — comparer Levenshtein contre « g5% » ou « 1 » est inutile.
  const words = field.split(/[\s\-_·,;:.()/\\]+/).filter((w) => w.length >= 3);
  return words.some((w) => levenshtein(q, w) <= tol);
};
