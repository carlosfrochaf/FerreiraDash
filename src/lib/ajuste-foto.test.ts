import { describe, expect, it } from "vitest";
import { acharCantos, aplicar, clarear, endireitar, girarCantos, homografia, type Pixels } from "./ajuste-foto";

function imagem(w: number, h: number, cor: (x: number, y: number) => number): Pixels {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const o = (y * w + x) * 4;
      data[o] = data[o + 1] = data[o + 2] = cor(x, y);
      data[o + 3] = 255;
    }
  return { data, width: w, height: h };
}

describe("homografia", () => {
  it("leva cada canto no seu par", () => {
    const de = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }];
    const para = [{ x: 2, y: 3 }, { x: 40, y: 1 }, { x: 45, y: 30 }, { x: 0, y: 28 }];
    const h = homografia(de, para);
    de.forEach((p, i) => {
      const q = aplicar(h, p);
      expect(q.x).toBeCloseTo(para[i].x, 6);
      expect(q.y).toBeCloseTo(para[i].y, 6);
    });
  });
});

describe("endireitar", () => {
  it("recorta só o retângulo escolhido", () => {
    const img = imagem(20, 20, (x, y) => (x >= 5 && x < 15 && y >= 5 && y < 15 ? 255 : 0));
    const r = endireitar(img, [{ x: 5, y: 5 }, { x: 14, y: 5 }, { x: 14, y: 14 }, { x: 5, y: 14 }], 10, 10);
    expect(r.width).toBe(10);
    expect([...r.data].filter((_, i) => i % 4 === 0).every((v) => v === 255)).toBe(true);
  });
});

describe("clarear", () => {
  it("foto escura fica com branco de verdade", () => {
    const img = imagem(10, 10, (x) => 20 + x * 8);
    const r = clarear(img);
    expect(Math.max(...r.data.filter((_, i) => i % 4 === 0))).toBe(255);
    expect(Math.min(...r.data.filter((_, i) => i % 4 === 0))).toBe(0);
  });
});

describe("acharCantos", () => {
  it("acha o papel claro sobre a mesa escura", () => {
    const img = imagem(100, 100, (x, y) => (x >= 20 && x <= 80 && y >= 10 && y <= 90 ? 230 : 40));
    const c = acharCantos(img)!;
    expect(c[0].x).toBeCloseTo(0.2, 1);
    expect(c[0].y).toBeCloseTo(0.1, 1);
    expect(c[2].x).toBeCloseTo(0.81, 1);
    expect(c[2].y).toBeCloseTo(0.91, 1);
  });
  it("sem papel devolve null", () => {
    expect(acharCantos(imagem(50, 50, () => 128))).toBeNull();
  });
});

describe("girarCantos", () => {
  it("mantém a ordem sup-esq, sup-dir, inf-dir, inf-esq", () => {
    const c = girarCantos([{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }]);
    expect(c).toEqual([{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }]);
  });
});
