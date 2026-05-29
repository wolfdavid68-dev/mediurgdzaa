export const STORAGE_KEYS = {
  theme: "mediurg-theme",
  bigFont: "mediurg-bigfont",
  favorites: "mediurg-favorites",
  history: "mediurg-history",
  patientWeight: "mediurg-patient-weight",
  profileCache: "mediurg-profile-cache-v1",
  announce: "mediurg-announce",
  charterAccepted: "mediurg-charter-accepted",
  acrProtocol: "mediurg-acr-protocol",
  acrCoach: "mediurg-acr-coach",
  preloadReloaded: "mediurg-preload-reloaded",
} as const;

export const STORAGE_PREFIXES = {
  anonymous: "mediurg-",
  user: (userId: string) => `mediurg-u${userId}-`,
  migratedTo: "mediurg-migrated-to-",
  preview: "mediurg-preview-",
  note: "mediurg-note-",
  kitCheck: "mediurg-kit-check-",
  kitChecklist: "mediurg-kit-checklist-",
} as const;

export const storageKey = {
  userItem: (userId: string | null, key: string): string =>
    `${userId ? STORAGE_PREFIXES.user(userId) : STORAGE_PREFIXES.anonymous}${key}`,
  migrationDone: (userId: string): string => `${STORAGE_PREFIXES.migratedTo}${userId}`,
  preview: (name: string): string => `${STORAGE_PREFIXES.preview}${name}`,
  note: (drugId: number | string): string => `${STORAGE_PREFIXES.note}${drugId}`,
  kitCheck: (kitId: string): string => `${STORAGE_PREFIXES.kitCheck}${kitId}`,
  kitChecklist: (kitId: string): string => `${STORAGE_PREFIXES.kitChecklist}${kitId}`,
};
