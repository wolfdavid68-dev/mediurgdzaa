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

const ANON_PREFIX = "mediurg-";

// Clés à migrer du mode anonyme vers le mode authentifié au 1er login.
// Ne PAS inclure les notes par drug (mediurg-note-{id}) qui sont gérées
// séparément (voir migrateAnonymousNotes).
const MIGRATABLE_KEYS = ["favorites", "history", "theme", "bigfont", "acr-protocol", "coach-mode"];

const userPrefix = (userId: string | null): string =>
  userId ? `mediurg-u${userId}-` : ANON_PREFIX;

// Lecture sécurisée — retourne null si localStorage indisponible (mode privé,
// quotas, etc.) ou si la clé n'existe pas.
export const readUserItem = (userId: string | null, key: string): string | null => {
  try {
    return localStorage.getItem(userPrefix(userId) + key);
  } catch {
    return null;
  }
};

export const writeUserItem = (userId: string | null, key: string, value: string): void => {
  try {
    localStorage.setItem(userPrefix(userId) + key, value);
  } catch {
    // Quota dépassé, mode privé, etc. — l'app continue sans persistance.
  }
};

export const removeUserItem = (userId: string | null, key: string): void => {
  try {
    localStorage.removeItem(userPrefix(userId) + key);
  } catch {}
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

const MIGRATION_DONE_KEY_PREFIX = "mediurg-migrated-to-";

export const migrateAnonymousData = (
  userId: string,
  drugIds: number[]
): { migrated: number; skipped: number } => {
  if (!userId) return { migrated: 0, skipped: 0 };
  // Skip si déjà fait
  try {
    if (localStorage.getItem(MIGRATION_DONE_KEY_PREFIX + userId) === "1") {
      return { migrated: 0, skipped: 0 };
    }
  } catch {
    return { migrated: 0, skipped: 0 };
  }

  let migrated = 0;
  let skipped = 0;

  // Migre les clés simples
  for (const key of MIGRATABLE_KEYS) {
    try {
      const anonValue = localStorage.getItem(ANON_PREFIX + key);
      if (anonValue === null) continue;
      const userKey = userPrefix(userId) + key;
      // Si l'user a déjà une valeur, on ne l'écrase pas (priorité aux
      // données déjà associées à son compte).
      if (localStorage.getItem(userKey) !== null) {
        skipped++;
        continue;
      }
      localStorage.setItem(userKey, anonValue);
      migrated++;
    } catch {
      skipped++;
    }
  }

  // Migre les notes par drug
  for (const drugId of drugIds) {
    try {
      const anonValue = localStorage.getItem(`${ANON_PREFIX}note-${drugId}`);
      if (!anonValue) continue;
      const userKey = `${userPrefix(userId)}note-${drugId}`;
      if (localStorage.getItem(userKey) !== null) {
        skipped++;
        continue;
      }
      localStorage.setItem(userKey, anonValue);
      migrated++;
    } catch {
      skipped++;
    }
  }

  // Marque la migration comme faite pour cet user
  try {
    localStorage.setItem(MIGRATION_DONE_KEY_PREFIX + userId, "1");
  } catch {}

  return { migrated, skipped };
};
