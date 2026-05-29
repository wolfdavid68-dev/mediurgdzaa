// Helper localStorage préfixé par userId — permet le multi-user sur le
// même device (plusieurs comptes peuvent partager la PWA installée sans
// se voler les notes/favoris).
//
// Convention de clés :
//   - Mode anonyme (AUTH_ENABLED=false) : `mediurg-{key}` (ex: `mediurg-favorites`)
//     → compatibilité 100% avec l'existant.
//   - Mode authentifié : `mediurg-u{userId}-{key}` (ex: `mediurg-uabc123-favorites`)
//
// Migration : quand l'auth est activée pour la 1re fois et qu'un utilisateur
// se logue, ses clés anonymes sont copiées vers ses clés préfixées (1 fois,
// puis les clés anonymes sont laissées pour fallback si plusieurs users du
// même device se logueront ensuite). Cf. migrateAnonymousData().

import { safeGetItem, safeRemoveItem, safeSetItem } from "./safeStorage";
import { STORAGE_PREFIXES, storageKey } from "./storageKeys";

// Clés à migrer du mode anonyme vers le mode authentifié au 1er login.
// Ne PAS inclure les notes/kits dynamiques, gérés séparément plus bas.
const MIGRATABLE_KEYS = [
  "favorites",
  "history",
  "theme",
  "bigfont",
  "acr-protocol",
  "acr-coach",
  "coach-mode",
];
const MIGRATABLE_DYNAMIC_PREFIXES = [STORAGE_PREFIXES.kitCheck, STORAGE_PREFIXES.kitChecklist];

const listLocalStorageKeys = (): string[] => {
  try {
    return Array.from({ length: localStorage.length }, (_, index) =>
      localStorage.key(index)
    ).filter((key): key is string => Boolean(key));
  } catch {
    return [];
  }
};

// Lecture sécurisée — retourne null si localStorage indisponible (mode privé,
// quotas, etc.) ou si la clé n'existe pas.
export const readUserItem = (userId: string | null, key: string): string | null => {
  return safeGetItem(storageKey.userItem(userId, key));
};

export const writeUserItem = (userId: string | null, key: string, value: string): void => {
  safeSetItem(storageKey.userItem(userId, key), value);
};

export const removeUserItem = (userId: string | null, key: string): void => {
  safeRemoveItem(storageKey.userItem(userId, key));
};

// Notes par médicament — convention spécifique : `mediurg-note-{drugId}` en
// mode anonyme, `mediurg-u{userId}-note-{drugId}` en mode authentifié.
export const readUserNote = (userId: string | null, drugId: number): string | null =>
  readUserItem(userId, `note-${drugId}`);

export const writeUserNote = (userId: string | null, drugId: number, note: string): void =>
  writeUserItem(userId, `note-${drugId}`, note);

export const removeUserNote = (userId: string | null, drugId: number): void =>
  removeUserItem(userId, `note-${drugId}`);

// ─── Migration des données anonymes vers un user ─────────────
// Appelée une fois par AuthGate juste après le 1er login réussi du device.
// Idempotente : si la migration a déjà été faite pour cet user, no-op.

export const migrateAnonymousData = (
  userId: string,
  drugIds: number[]
): { migrated: number; skipped: number } => {
  if (!userId) return { migrated: 0, skipped: 0 };
  if (safeGetItem(storageKey.migrationDone(userId)) === "1") {
    return { migrated: 0, skipped: 0 };
  }

  let migrated = 0;
  let skipped = 0;

  // Migre les clés simples
  for (const key of MIGRATABLE_KEYS) {
    const anonValue = safeGetItem(storageKey.userItem(null, key));
    if (anonValue === null) continue;
    const userKey = storageKey.userItem(userId, key);
    // Si l'user a déjà une valeur, on ne l'écrase pas (priorité aux
    // données déjà associées à son compte).
    if (safeGetItem(userKey) !== null) {
      skipped++;
      continue;
    }
    if (safeSetItem(userKey, anonValue)) migrated++;
    else skipped++;
  }

  // Migre les notes par drug
  for (const drugId of drugIds) {
    const anonValue = safeGetItem(storageKey.note(drugId));
    if (!anonValue) continue;
    const userKey = storageKey.userItem(userId, `note-${drugId}`);
    if (safeGetItem(userKey) !== null) {
      skipped++;
      continue;
    }
    if (safeSetItem(userKey, anonValue)) migrated++;
    else skipped++;
  }

  // Migre les check-lists de kits, dont les clés dépendent de l'id du kit.
  for (const anonKey of listLocalStorageKeys()) {
    const prefix = MIGRATABLE_DYNAMIC_PREFIXES.find((item) => anonKey.startsWith(item));
    if (!prefix) continue;
    const anonValue = safeGetItem(anonKey);
    if (!anonValue) continue;
    const dynamicKey = anonKey.slice(STORAGE_PREFIXES.anonymous.length);
    const userKey = storageKey.userItem(userId, dynamicKey);
    if (safeGetItem(userKey) !== null) {
      skipped++;
      continue;
    }
    if (safeSetItem(userKey, anonValue)) migrated++;
    else skipped++;
  }

  // Marque la migration comme faite pour cet user
  safeSetItem(storageKey.migrationDone(userId), "1");

  return { migrated, skipped };
};
