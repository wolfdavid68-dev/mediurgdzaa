// Tokenizer pur des textes de protocoles : repère médicaments + doses.
// Le rendu JSX vit dans ProtocolCard.js — ici aucune dépendance React.

const DOSE_PATTERN =
  /\b(\d+(?:[,.]\d+)?(?:\s*[-–]\s*\d+(?:[,.]\d+)?)?)\s*(mg\/kg|µg\/kg|mL\/kg|mg\/h|mL\/h|L\/min|gouttes\/kg|mg|µg|mcg|mL|g\/L|g)\b(?:\/(?:kg|h|min|j|24h))?/g;

function buildDrugPattern(drugPatterns) {
  return new RegExp(
    `\\b(${drugPatterns.map(d => d.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})\\b`,
    "gi"
  );
}

// Découpe un texte protocole en tokens : { type: "text" | "drug" | "dose", value }
// Les médicaments l'emportent sur les doses en cas de chevauchement (cf. regex
// combinée — capture group 1 = drug, sinon dose).
export function tokenizeProtocolText(text, drugPatterns) {
  if (!text) return [];
  const drugRe = buildDrugPattern(drugPatterns);
  const combined = new RegExp(
    `(${drugRe.source})|(${DOSE_PATTERN.source})`,
    "gi"
  );

  const tokens = [];
  let last = 0;
  let match;
  combined.lastIndex = 0;
  while ((match = combined.exec(text)) !== null) {
    if (match.index > last) {
      tokens.push({ type: "text", value: text.slice(last, match.index) });
    }
    if (match[1]) {
      tokens.push({ type: "drug", value: match[1] });
    } else {
      tokens.push({ type: "dose", value: match[0] });
    }
    last = combined.lastIndex;
  }
  if (last < text.length) {
    tokens.push({ type: "text", value: text.slice(last) });
  }
  return tokens;
}
