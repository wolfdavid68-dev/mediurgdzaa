// Expose uniquement la clé publique VAPID Web Push.
// Ce n'est pas un secret : le navigateur en a besoin pour créer l'abonnement.

type VercelReq = { method?: string };
type VercelRes = {
  status: (code: number) => VercelRes;
  json: (body: unknown) => void;
  setHeader: (k: string, v: string) => void;
};

export default function handler(req: VercelReq, res: VercelRes) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.status(405).json({ error: "Methode non autorisee" });
    return;
  }

  const publicKey = process.env.WEB_PUSH_PUBLIC_KEY || process.env.VITE_WEB_PUSH_PUBLIC_KEY || "";
  res.status(publicKey ? 200 : 503).json({ publicKey });
}
