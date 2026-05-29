const { spawn } = require("node:child_process");
const net = require("node:net");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const findFreePort = (candidate) =>
  new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", () => resolve(findFreePort(candidate + 1)));
    server.once("listening", () => {
      server.close(() => resolve(candidate));
    });
    server.listen(candidate, "127.0.0.1");
  });

const waitForPreview = async (child, baseUrl, timeoutMs) => {
  let exitCode = null;
  child.on("exit", (code) => {
    exitCode = code;
  });

  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (exitCode !== null) {
      throw new Error(`vite preview s'est arrêté trop tôt (code ${exitCode})`);
    }
    try {
      const resp = await fetch(baseUrl);
      if (resp.ok) return;
    } catch {
      // Serveur pas encore prêt.
    }
    await sleep(250);
  }
  throw new Error("vite preview n'a pas démarré dans les temps");
};

const startPreview = async ({ root, port, timeoutMs = 20000 }) => {
  const args = [
    "run",
    "preview",
    "--",
    "--host",
    "127.0.0.1",
    "--port",
    String(port),
    "--strictPort",
  ];
  const isWindows = process.platform === "win32";
  const child = isWindows
    ? spawn(process.env.ComSpec || "cmd.exe", ["/d", "/s", "/c", `npm ${args.join(" ")}`], {
        cwd: root,
        env: { ...process.env, BROWSER: "none" },
        stdio: ["ignore", "pipe", "pipe"],
      })
    : spawn("npm", args, {
        cwd: root,
        detached: true,
        env: { ...process.env, BROWSER: "none" },
        stdio: ["ignore", "ignore", "ignore"],
      });

  child.stdout?.resume();
  child.stderr?.resume();
  await waitForPreview(child, `http://127.0.0.1:${port}`, timeoutMs);
  return child;
};

const stopPreview = (child, timeoutMs = 3000) =>
  new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      resolve();
    };

    if (!child || child.exitCode !== null || child.signalCode !== null) {
      finish();
      return;
    }

    if (process.platform === "win32") {
      const killer = spawn("taskkill", ["/PID", String(child.pid), "/T", "/F"], {
        stdio: "ignore",
      });
      killer.on("exit", finish);
      killer.on("error", () => {
        child.kill();
        finish();
      });
      setTimeout(finish, timeoutMs).unref?.();
      return;
    }

    child.once("exit", finish);
    try {
      process.kill(-child.pid, "SIGTERM");
    } catch {
      try {
        child.kill("SIGTERM");
      } catch {
        finish();
      }
    }

    setTimeout(() => {
      if (settled) return;
      try {
        process.kill(-child.pid, "SIGKILL");
      } catch {
        try {
          child.kill("SIGKILL");
        } catch {
          // Le processus est déjà terminé ou inaccessible.
        }
      }
      finish();
    }, timeoutMs).unref?.();
  });

module.exports = {
  findFreePort,
  sleep,
  startPreview,
  stopPreview,
};
