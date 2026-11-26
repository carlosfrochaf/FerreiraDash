import { describe, expect, it } from "vitest";
import { audiosCitados, ehAudio, juntarTranscricoes } from "./audios-conversa";

describe("ehAudio", () => {
  it("reconhece os áudios do WhatsApp e ignora fotos", () => {
    expect(ehAudio("PTT-20261112-WA0003.opus")).toBe(true);
    expect(ehAudio("00000012-AUDIO-2026-11-12-10-00-00.m4a")).toBe(true);
    expect(ehAudio("AUD-20261112-WA0001.mp3")).toBe(true);
    expect(ehAudio("IMG-20261112-WA0002.jpg")).toBe(false);
    expect(ehAudio("VID-20261112-WA0004.mp4")).toBe(false);
  });
});

const ANDROID = [
  "12/11/2026 10:01 - João: Boa tarde",
  "12/11/2026 10:02 - João: PTT-20261112-WA0003.opus (arquivo anexado)",
  "12/11/2026 10:03 - João: IMG-20261112-WA0004.jpg (arquivo anexado)",
].join("\n");

const IPHONE = "[12/11/26 10:02:03] João: ‎<anexado: 00000003-AUDIO-2026-11-12-10-02-03.opus>";

describe("audiosCitados", () => {
  it("só os áudios que aparecem na conversa, na ordem", () => {
    expect(audiosCitados(ANDROID)).toEqual(["PTT-20261112-WA0003.opus"]);
    expect(audiosCitados(IPHONE)).toEqual(["00000003-AUDIO-2026-11-12-10-02-03.opus"]);
  });
});

describe("juntarTranscricoes", () => {
  it("troca o anexo pelo texto do áudio (Android e iPhone)", () => {
    expect(juntarTranscricoes(ANDROID, { "PTT-20261112-WA0003.opus": "eu entrava às seis" })).toBe(
      [
        "12/11/2026 10:01 - João: Boa tarde",
        "12/11/2026 10:02 - João: [áudio] eu entrava às seis",
        "12/11/2026 10:03 - João: IMG-20261112-WA0004.jpg (arquivo anexado)",
      ].join("\n"),
    );
    expect(juntarTranscricoes(IPHONE, { "00000003-AUDIO-2026-11-12-10-02-03.opus": "de segunda a sábado" })).toBe(
      "[12/11/26 10:02:03] João: ‎[áudio] de segunda a sábado",
    );
  });

  it("áudio sem transcrição fica marcado como não ouvido", () => {
    expect(juntarTranscricoes(ANDROID, {})).toContain("João: [áudio não transcrito]");
  });

  it("transcrição com quebra de linha vira uma linha só", () => {
    expect(juntarTranscricoes(ANDROID, { "PTT-20261112-WA0003.opus": "linha um\nlinha dois" })).toContain("[áudio] linha um linha dois");
  });
});
