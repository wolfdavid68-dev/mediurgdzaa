import { requestPersistentStorage } from "../lib/persistStorage";

// persistStorage vit dans src/lib mais touche navigator → projet "dom".

const setStorage = (value: unknown) =>
  Object.defineProperty(navigator, "storage", { configurable: true, value });

describe("requestPersistentStorage", () => {
  afterEach(() => setStorage(undefined));

  test("API absente → false (best-effort, pas de crash)", async () => {
    setStorage(undefined);
    expect(await requestPersistentStorage()).toBe(false);
  });

  test("déjà persistant → true sans rappeler persist()", async () => {
    const persist = vi.fn();
    setStorage({ persisted: vi.fn().mockResolvedValue(true), persist });
    expect(await requestPersistentStorage()).toBe(true);
    expect(persist).not.toHaveBeenCalled();
  });

  test("pas encore persistant → renvoie le résultat de persist()", async () => {
    setStorage({
      persisted: vi.fn().mockResolvedValue(false),
      persist: vi.fn().mockResolvedValue(true),
    });
    expect(await requestPersistentStorage()).toBe(true);
  });

  test("persist() throw → false (jamais bloquant)", async () => {
    setStorage({
      persisted: vi.fn().mockResolvedValue(false),
      persist: vi.fn().mockRejectedValue(new Error("refus")),
    });
    expect(await requestPersistentStorage()).toBe(false);
  });
});
