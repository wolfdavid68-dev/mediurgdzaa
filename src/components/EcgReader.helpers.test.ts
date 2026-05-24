import { describe, expect, test } from "vitest";
import { getEcgAnonymizationMasks } from "./EcgReader.helpers";

describe("getEcgAnonymizationMasks", () => {
  test("couvre les zones d'identité probables sans masquer toute l'image", () => {
    const masks = getEcgAnonymizationMasks(1000, 800);

    expect(masks).toEqual([
      { x: 0, y: 0, width: 1000, height: 128 },
      { x: 0, y: 756, width: 1000, height: 44 },
      { x: 0, y: 0, width: 35, height: 800 },
      { x: 965, y: 0, width: 35, height: 800 },
    ]);
  });

  test("garde des dimensions valides sur une petite image", () => {
    const masks = getEcgAnonymizationMasks(120, 90);

    expect(masks.every((mask) => mask.width > 0 && mask.height > 0)).toBe(true);
    expect(masks.every((mask) => mask.x >= 0 && mask.y >= 0)).toBe(true);
    expect(masks.every((mask) => mask.x + mask.width <= 120)).toBe(true);
    expect(masks.every((mask) => mask.y + mask.height <= 90)).toBe(true);
  });
});
