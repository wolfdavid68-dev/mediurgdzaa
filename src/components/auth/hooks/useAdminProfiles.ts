import { useEffect, useState } from "react";
import {
  fetchProfilesByStatus,
  approveProfile,
  rejectProfile,
  banProfile,
  unbanProfile,
  logout,
  type Profile,
  type ProfileStatus,
} from "../../../lib/auth";

// Logique de la console d'admin, partagée par AdminDashboard (desktop,
// sidebar + drawer) et MobileAdminDashboard (tab bar + bottom sheet).
// Fetch par statut, actions Supabase, toast et compteur de demandes
// centralisés ; chaque variante n'apporte que son markup.

export type AdminTab = ProfileStatus; // "pending" | "active" | "banned"
export type AdminToast = { kind: "ok" | "warn"; msg: string } | null;

type ActionResult = { ok: true } | { ok: false; error: string };

export const useAdminProfiles = (onLogout: () => void) => {
  const [tab, setTab] = useState<AdminTab>("pending");
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Profile | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState<AdminToast>(null);

  const reload = async (forStatus: ProfileStatus) => {
    setLoading(true);
    setError(null);
    const result = await fetchProfilesByStatus(forStatus);
    setLoading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setProfiles(result.data);
    if (forStatus === "pending") setPendingCount(result.data.length);
  };

  const refreshPendingCount = async () => {
    const result = await fetchProfilesByStatus("pending");
    if (result.ok) setPendingCount(result.data.length);
  };

  // reload(tab) tourne aussi au montage (tab initial = "pending") et met
  // déjà pendingCount à jour pour ce statut → pas de fetch dédié au montage.
  useEffect(() => {
    reload(tab);
  }, [tab]);

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
    runAction(p, () => approveProfile(p.id), "ok", `${p.prenom} ${p.nom} approuvé(e)`);
  const reject = (p: Profile) =>
    runAction(p, () => rejectProfile(p.id), "warn", `Demande de ${p.prenom} ${p.nom} refusée`);
  const ban = (p: Profile, reason: string) =>
    runAction(p, () => banProfile(p.id, reason), "warn", `${p.prenom} ${p.nom} suspendu(e)`);
  const unban = (p: Profile) =>
    runAction(p, () => unbanProfile(p.id), "ok", `${p.prenom} ${p.nom} rétabli(e)`);

  const handleLogout = async () => {
    await logout();
    onLogout();
  };

  return {
    tab,
    setTab,
    profiles,
    pendingCount,
    loading,
    error,
    selected,
    setSelected,
    busyId,
    toast,
    reload,
    approve,
    reject,
    ban,
    unban,
    handleLogout,
  };
};
