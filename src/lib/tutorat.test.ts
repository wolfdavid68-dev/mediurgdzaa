import { describe, expect, test } from "vitest";
import {
  buildTutoratLoginRequestUrl,
  buildTutoratTokenUrl,
  shouldOpenTutoratFromLogin,
} from "./tutorat";

describe("tutorat bridge", () => {
  test("detecte la demande d'ouverture Tutorat apres login MediURG", () => {
    expect(shouldOpenTutoratFromLogin("?open=tutorat")).toBe(true);
    expect(shouldOpenTutoratFromLogin("?open=mediurg")).toBe(false);
    expect(shouldOpenTutoratFromLogin("")).toBe(false);
  });

  test("construit l'URL MediURG qui declenche le retour vers Tutorat", () => {
    expect(buildTutoratLoginRequestUrl("https://mediurg.example/app?author=preview")).toBe(
      "https://mediurg.example/app?author=preview&open=tutorat"
    );
  });

  test("ajoute le token signe dans l'URL Tutorat", () => {
    expect(buildTutoratTokenUrl("jwt-demo", "https://tutorat.example/etudiant/s1?tab=acts")).toBe(
      "https://tutorat.example/etudiant/s1?tab=acts&token=jwt-demo"
    );
    expect(buildTutoratTokenUrl("jwt-demo", "/tutorat/")).toBe(
      "http://localhost:3000/tutorat/?token=jwt-demo"
    );
  });
});
