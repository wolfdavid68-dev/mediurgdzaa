import { readFileSync } from "node:fs";
import vm from "node:vm";

const loadPushHandlerContext = () => {
  const context = {
    URL,
    self: {
      location: { origin: "https://mediurg.example" },
      addEventListener: vi.fn(),
      registration: { showNotification: vi.fn() },
      clients: { matchAll: vi.fn(), openWindow: vi.fn() },
    },
  };
  vm.runInNewContext(readFileSync("public/push-handler.js", "utf8"), context);
  return context as typeof context & {
    getSafeNotificationUrl: (rawUrl?: string) => string;
  };
};

describe("push-handler notificationclick", () => {
  test("conserve les URLs same-origin", () => {
    const context = loadPushHandlerContext();
    expect(context.getSafeNotificationUrl("/admin?tab=audit")).toBe(
      "https://mediurg.example/admin?tab=audit"
    );
  });

  test("remplace les URLs externes par l'accueil", () => {
    const context = loadPushHandlerContext();
    expect(context.getSafeNotificationUrl("https://evil.example/phishing")).toBe(
      "https://mediurg.example/"
    );
  });

  test("remplace les URLs invalides par l'accueil", () => {
    const context = loadPushHandlerContext();
    expect(context.getSafeNotificationUrl("https://%")).toBe("https://mediurg.example/");
  });
});
