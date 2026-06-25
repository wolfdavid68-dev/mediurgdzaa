import { describe, expect, test } from "vitest";
import { buildTutoratPayload } from "../../api/generate-tutorat-token";

describe("generate tutorat token payload", () => {
  test("embarque le profil MediURG serveur dans le JWT signe", () => {
    const payload = buildTutoratPayload({
      id: "profile-1",
      mediurg_user_id: "m123",
      email: "as@example.fr",
      prenom: "Alice",
      nom: "Demo",
      fonction: "Aide-soignant",
      role: "user",
      is_admin: false,
      note: "Equipe AS",
    });

    expect(payload).toMatchObject({
      userId: "m123",
      sub: "profile-1",
      id: "profile-1",
      email: "as@example.fr",
      fonction: "Aide-soignant",
      role: "user",
      profile: {
        id: "profile-1",
        mediurg_user_id: "m123",
        email: "as@example.fr",
        prenom: "Alice",
        nom: "Demo",
        fonction: "Aide-soignant",
        role: "user",
        is_admin: false,
        note: "Equipe AS",
      },
    });
    expect(typeof payload.iat).toBe("number");
    expect(typeof payload.exp).toBe("number");
  });
});
