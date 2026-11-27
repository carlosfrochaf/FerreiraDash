// Ajuste de foto de documento (endireitar, clarear, achar as bordas). Puro: trabalha com pixels RGBA.

export type Ponto = { x: number; y: number };
export type Pixels = { data: Uint8ClampedArray; width: number; height: number };

/** Resolve A·x = b (eliminação de Gauss com pivô). */
function resolver(a: number[][], b: number[]): number[] {
  const n = b.length;
  const m = a.map((l, i) => [...l, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let l = c + 1; l < n; l++) if (Math.abs(m[l][c]) > Math.abs(m[p][c])) p = l;
    [m[c], m[p]] = [m[p], m[c]];
    for (let l = 0; l < n; l++) {
      if (l === c) continue;
      const f = m[l][c] / m[c][c];
      for (let k = c; k <= n; k++) m[l][k] -= f * m[c][k];
    }
  }
  return m.map((l, i) => l[n] / l[i]);
}

/** Homografia que leva os 4 pontos `de` nos 4 pontos `para` (9 números, h8 = 1). */
export function homografia(de: Ponto[], para: Ponto[]): number[] {
  const a: number[][] = [];
  const b: number[] = [];
  for (let i = 0; i < 4; i++) {
    const { x, y } = de[i];
    const { x: u, y: v } = para[i];
    a.push([x, y, 1, 0, 0, 0, -u * x, -u * y]);
    b.push(u);
    a.push([0, 0, 0, x, y, 1, -v * x, -v * y]);
    b.push(v);
  }
  return [...resolver(a, b), 1];
}

export function aplicar(h: number[], p: Ponto): Ponto {
  const w = h[6] * p.x + h[7] * p.y + h[8];
  return { x: (h[0] * p.x + h[1] * p.y + h[2]) / w, y: (h[3] * p.x + h[4] * p.y + h[5]) / w };
}

const dist = (a: Ponto, b: Ponto) => Math.hypot(a.x - b.x, a.y - b.y);

/** Tamanho do documento endireitado. Cantos em ordem: sup-esq, sup-dir, inf-dir, inf-esq. */
export function tamanhoEndireitado(c: Ponto[]): { largura: number; altura: number } {
  return {
    largura: Math.max(1, Math.round(Math.max(dist(c[0], c[1]), dist(c[3], c[2])))),
    altura: Math.max(1, Math.round(Math.max(dist(c[0], c[3]), dist(c[1], c[2])))),
  };
}

/** Recorta e endireita o quadrilátero `cantos` (em pixels da imagem) para um retângulo largura×altura. */
export function endireitar(img: Pixels, cantos: Ponto[], largura: number, altura: number): Pixels {
  const ret = [{ x: 0, y: 0 }, { x: largura - 1, y: 0 }, { x: largura - 1, y: altura - 1 }, { x: 0, y: altura - 1 }];
  const h = homografia(ret, cantos);
  const out = new Uint8ClampedArray(largura * altura * 4);
  const { data, width, height } = img;
  for (let y = 0; y < altura; y++) {
    for (let x = 0; x < largura; x++) {
      const p = aplicar(h, { x, y });
      const sx = Math.min(width - 1, Math.max(0, p.x));
      const sy = Math.min(height - 1, Math.max(0, p.y));
      const x0 = Math.floor(sx), y0 = Math.floor(sy);
      const x1 = Math.min(width - 1, x0 + 1), y1 = Math.min(height - 1, y0 + 1);
      const fx = sx - x0, fy = sy - y0;
      const o = (y * largura + x) * 4;
      for (let k = 0; k < 4; k++) {
        const a = data[(y0 * width + x0) * 4 + k], b = data[(y0 * width + x1) * 4 + k];
        const c = data[(y1 * width + x0) * 4 + k], d = data[(y1 * width + x1) * 4 + k];
        out[o + k] = (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy;
      }
    }
  }
  return { data: out, width: largura, height: altura };
}

const luz = (d: Uint8ClampedArray, i: number) => 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];

/** Foto escura: estica o brilho (1% mais escuro vira preto, 1% mais claro vira branco), mantendo as cores. */
export function clarear(img: Pixels): Pixels {
  const { data } = img;
  const hist = new Array(256).fill(0);
  const n = data.length / 4;
  for (let i = 0; i < data.length; i += 4) hist[Math.round(luz(data, i))]++;
  let acc = 0, lo = 0, hi = 255;
  for (let v = 0; v < 256; v++) { acc += hist[v]; if (acc >= n * 0.01) { lo = v; break; } }
  acc = 0;
  for (let v = 255; v >= 0; v--) { acc += hist[v]; if (acc >= n * 0.01) { hi = v; break; } }
  const escala = 255 / Math.max(1, hi - lo);
  const out = new Uint8ClampedArray(data.length);
  for (let i = 0; i < data.length; i += 4) {
    for (let k = 0; k < 3; k++) out[i + k] = (data[i + k] - lo) * escala;
    out[i + 3] = 255;
  }
  return { data: out, width: img.width, height: img.height };
}

/** Modo "documento": preto e branco com fundo branco (tira sombra e papel amarelado). */
export function documento(img: Pixels): Pixels {
  const { width: w, height: h, data } = img;
  const cinza = new Float64Array(w * h);
  for (let i = 0; i < w * h; i++) cinza[i] = luz(data, i * 4);
  // Fundo = média numa janela grande (imagem integral).
  const r = Math.max(4, Math.round(Math.max(w, h) / 25));
  const soma = new Float64Array((w + 1) * (h + 1));
  for (let y = 0; y < h; y++) {
    let linha = 0;
    for (let x = 0; x < w; x++) {
      linha += cinza[y * w + x];
      soma[(y + 1) * (w + 1) + x + 1] = soma[y * (w + 1) + x + 1] + linha;
    }
  }
  const out = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    const ya = Math.max(0, y - r), yb = Math.min(h, y + r + 1);
    for (let x = 0; x < w; x++) {
      const xa = Math.max(0, x - r), xb = Math.min(w, x + r + 1);
      const s = soma[yb * (w + 1) + xb] - soma[ya * (w + 1) + xb] - soma[yb * (w + 1) + xa] + soma[ya * (w + 1) + xa];
      const fundo = Math.max(1, s / ((xb - xa) * (yb - ya)));
      const v = Math.min(255, (cinza[y * w + x] / fundo) * 255);
      const c = v > 235 ? 255 : Math.pow(v / 255, 1.6) * 255; // texto mais escuro
      const o = (y * w + x) * 4;
      out[o] = out[o + 1] = out[o + 2] = c;
      out[o + 3] = 255;
    }
  }
  return { data: out, width: w, height: h };
}

/**
 * Acha as 4 pontas do papel (mais claro que o fundo). Use numa imagem pequena (~400 px).
 * Devolve os cantos em frações (0 a 1) na ordem sup-esq, sup-dir, inf-dir, inf-esq, ou null se não achar.
 */
export function acharCantos(img: Pixels): Ponto[] | null {
  const { width: w, height: h, data } = img;
  const n = w * h;
  const g = new Uint8Array(n);
  const hist = new Array(256).fill(0);
  for (let i = 0; i < n; i++) hist[(g[i] = Math.round(luz(data, i * 4)))]++;
  // Limiar de Otsu.
  let total = 0;
  for (let v = 0; v < 256; v++) total += v * hist[v];
  let somaB = 0, pesoB = 0, melhor = 0, limiar = 128;
  for (let v = 0; v < 256; v++) {
    pesoB += hist[v];
    if (!pesoB || pesoB === n) continue;
    somaB += v * hist[v];
    const mb = somaB / pesoB, mf = (total - somaB) / (n - pesoB);
    const entre = pesoB * (n - pesoB) * (mb - mf) ** 2;
    if (entre > melhor) { melhor = entre; limiar = v; }
  }
  // Maior pedaço claro conectado.
  const rotulo = new Int32Array(n).fill(-1);
  let maior: number[] = [];
  const fila = new Int32Array(n);
  for (let s = 0; s < n; s++) {
    if (g[s] <= limiar || rotulo[s] !== -1) continue;
    let ini = 0, fim = 0;
    fila[fim++] = s;
    rotulo[s] = s;
    const pedaco: number[] = [];
    while (ini < fim) {
      const p = fila[ini++];
      pedaco.push(p);
      const x = p % w, y = (p - x) / w;
      for (const q of [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, y > 0 ? p - w : -1, y < h - 1 ? p + w : -1]) {
        if (q >= 0 && rotulo[q] === -1 && g[q] > limiar) { rotulo[q] = s; fila[fim++] = q; }
      }
    }
    if (pedaco.length > maior.length) maior = pedaco;
  }
  if (maior.length < n * 0.15 || maior.length > n * 0.97) return null;
  let se = 0, sd = 0, id = 0, ie = 0;
  let vse = Infinity, vsd = -Infinity, vid = -Infinity, vie = Infinity;
  for (const p of maior) {
    const x = p % w, y = (p - x) / w;
    if (x + y < vse) { vse = x + y; se = p; }
    if (x + y > vid) { vid = x + y; id = p; }
    if (x - y > vsd) { vsd = x - y; sd = p; }
    if (x - y < vie) { vie = x - y; ie = p; }
  }
  return [se, sd, id, ie].map((p) => ({ x: (p % w) / (w - 1), y: Math.floor(p / w) / (h - 1) }));
}

/** Cantos-padrão quando não acha o papel: 5% para dentro. */
export const CANTOS_PADRAO: Ponto[] = [{ x: 0.05, y: 0.05 }, { x: 0.95, y: 0.05 }, { x: 0.95, y: 0.95 }, { x: 0.05, y: 0.95 }];

/** Cantos depois de girar a foto 90° no sentido horário (frações), reordenados. */
export function girarCantos(c: Ponto[]): Ponto[] {
  const g = c.map((p) => ({ x: 1 - p.y, y: p.x }));
  return [g[3], g[0], g[1], g[2]];
}
