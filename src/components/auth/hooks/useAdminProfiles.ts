import { useEffect, useState } from "react";
import {
  fetchProfilesByStatus,
  fetchAdminAuditEvents,
  approveProfile,
  rejectProfile,
  banProfile,
  unbanProfile,
  logout,
  isStudentFunction,
  type AdminAuditEventWithActor,
  type Profile,
  type ProfileStatus,
} from "../../../lib/auth";
import {
  disableAdminPushNotifications,
  enableAdminPushNotifications,
  getAdminPushStatus,
  sendAdminPushTestNotification,
  type PushNotificationStatus,
} from "../../../lib/pushNotifications";

// Logique de la console d'admin, partagée par AdminDashboard (desktop,
// sidebar + drawer) et MobileAdminDashboard (tab bar + bottom sheet).
// Fetch par statut, actions Supabase, toast et compteur de demandes
// centralisés ; chaque variante n'apporte que son markup.

export type AdminTab = ProfileStatus | "audit";
export type AdminToast = { kind: "ok" | "warn"; msg: string } | null;

type ActionResult = { ok: true } | { ok: false; error: string };

const sortProfilesForAdmin = (profiles: Profile[]): Profile[] =>
  [...profiles].sort((a, b) => {
    const aStudent = isStudentFunction(a.fonction);
    const bStudent = isStudentFunction(b.fonction);
    if (aStudent !== bStudent) return aStudent ? 1 : -1;
    return `${a.nom} ${a.prenom}`.localeCompare(`${b.nom} ${b.prenom}`, "fr", {
      sensitivity: "base",
    });
  });

export const useAdminProfiles = (onLogout: () => void, currentAdminId: string) => {
  const [tab, setTab] = useState<AdminTab>("pending");
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [auditEvents, setAuditEvents] = useState<AdminAuditEventWithActor[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [auditLoading, setAuditLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Profile | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState<AdminToast>(null);
  const [pushStatus, setPushStatus] = useState<PushNotificationStatus>("unsupported");
  const [pushBusy, setPushBusy] = useState(false);
  const [pushTestBusy, setPushTestBusy] = useState(false);

  const reload = async (forStatus: ProfileStatus) => {
    setLoading(true);
    setError(null);
    const result = await fetchProfilesByStatus(forStatus);
    setLoading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setProfiles(sortProfilesForAdmin(result.data));
    if (forStatus === "pending") setPendingCount(result.data.length);
  };

  const reloadAudit = async () => {
    setAuditLoading(true);
    setError(null);
    const result = await fetchAdminAuditEvents();
    setAuditLoading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setAuditEvents(result.data);
  };

  const refreshPendingCount = async () => {
    const result = await fetchProfilesByStatus("pending");
    if (result.ok) setPendingCount(result.data.length);
  };

  // reload(tab) tourne aussi au montage (tab initial = "pending") et met
  // déjà pendingCount à jour pour ce statut → pas de fetch dédié au montage.
  useEffect(() => {
    if (tab === "audit") {
      reloadAudit();
      return;
    }
    reload(tab);
  }, [tab]);

  useEffect(() => {
    getAdminPushStatus()
      .then(setPushStatus)
      .catch(() => setPushStatus("unsupported"));
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(t);
  }, [toast]);

  const runAction = async (
    p: Profile,
    action: () => Promise<ActionResult>,
    kind: "ok" | "warn",
    msg: string
  ) => {
    setBusyId(p.id);
    const result = await action();
    setBusyId(null);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setProfiles((list) => list.filter((x) => x.id !== p.id));
    setSelected(null);
    setToast({ kind, msg });
    refreshPendingCount();
  };

  const approve = (p: Profile) =>
    runAction(p, () => approveProfile(p, currentAdminId), "ok", `${p.prenom} ${p.nom} approuvé(e)`);
  const reject = (p: Profile) =>
    runAction(
      p,
      () => rejectProfile(p, currentAdminId),
      "warn",
      `Demande de ${p.prenom} ${p.nom} refusée`
    );
  const ban = (p: Profile, reason: string) =>
    runAction(
      p,
      () => banProfile(p, reason, currentAdminId),
      "warn",
      `${p.prenom} ${p.nom} suspendu(e)`
    );
  const unban = (p: Profile) =>
    runAction(p, () => unbanProfile(p, currentAdminId), "ok", `${p.prenom} ${p.nom} rétabli(e)`);

  const exportAuditCsv = () => {
    if (auditEvents.length === 0) return;
    const rows = [
      ["date", "action", "admin", "admin_matricule", "cible", "cible_matricule", "motif"],
      ...auditEvents.map((event) => [
        event.created_at,
        event.action,
        event.actor ? `${event.actor.prenom} ${event.actor.nom}` : event.actor_id,
        event.actor?.matricule ?? "",
        `${event.target_prenom} ${event.target_nom}`,
        event.target_matricule,
        event.reason ?? "",
      ]),
    ];
    const csv = rows
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(";"))
      .join("\n");
    const blob = new Blob([`\ufeff${csv}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `mediurg-journal-admin-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleLogout = async () => {
    // onLogout DOIT s'exécuter même si logout() échoue (sinon « clic sur
    // déconnexion, rien ne se passe »). On AVALE l'erreur (catch, pas
    // juste finally) sinon la rejection remonte non gérée. logout() est
    // déjà non-throw — ceci est une ceinture de sécurité.
    try {
      await logout();
    } catch {
      /* logout best-effort : on déconnecte l'UI quoi qu'il arrive */
    }
    onLogout();
  };

  const enablePush = async () => {
    if (pushStatus === "unsupported") {
      setToast({ kind: "warn", msg: "Notifications non supportées sur cet appareil" });
      return;
    }
    if (pushStatus === "missing-key") {
      setToast({ kind: "warn", msg: "Clé Web Push manquante : redéploiement Vercel requis" });
      return;
    }
    if (pushStatus === "denied") {
      setToast({
        kind: "warn",
        msg: "Notifications bloquées : autorise-les dans les réglages du navigateur",
      });
      return;
    }

    setPushBusy(true);
    const result = await enableAdminPushNotifications();
    setPushBusy(false);
    if (!result.ok) {
      setToast({ kind: "warn", msg: result.error });
      return;
    }
    setPushStatus(result.status);
    setToast({
      kind: result.status === "enabled" ? "ok" : "warn",
      msg:
        result.status === "enabled"
          ? "Notifications activées sur cet appareil"
          : "Autorisation de notification en attente",
    });
  };

  const disablePush = async () => {
    setPushBusy(true);
    const result = await disableAdminPushNotifications();
    setPushBusy(false);
    if (!result.ok) {
      setToast({ kind: "warn", msg: result.error });
      return;
    }
    setPushStatus(result.status);
    setToast({ kind: "ok", msg: "Notifications désactivées sur cet appareil" });
  };

  const testPush = async () => {
    if (pushStatus !== "enabled") {
      setToast({ kind: "warn", msg: "Active d'abord les notifications sur cet appareil" });
      return;
    }

    setPushTestBusy(true);
    const result = await sendAdminPushTestNotification();
    setPushTestBusy(false);
    if (!result.ok) {
      setToast({ kind: "warn", msg: result.error });
      return;
    }
    setToast({
      kind: "ok",
      msg: result.sent > 0 ? "Notification test envoyée" : "Aucun appareil joint",
    });
  };

  return {
    tab,
    setTab,
    profiles,
    auditEvents,
    pendingCount,
    loading,
    auditLoading,
    error,
    selected,
    setSelected,
    busyId,
    toast,
    pushStatus,
    pushBusy,
    pushTestBusy,
    reload,
    reloadAudit,
    exportAuditCsv,
    approve,
    reject,
    ban,
    unban,
    handleLogout,
    enablePush,
    disablePush,
    testPush,
  };
};
