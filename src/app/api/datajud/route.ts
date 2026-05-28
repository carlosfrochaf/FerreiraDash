import { NextResponse } from "next/server";

const TRIBUNAL_MAPPING: Record<string, string> = {
  "8.26": "tjsp", "8.19": "tjrj", "8.13": "tjmg", "8.21": "tjrs", "8.09": "tjpr",
  "8.06": "tjce", "8.17": "tjpe", "8.05": "tjba", "8.24": "tjsc", "8.16": "tgespr",
  "5.02": "trt2", "5.15": "trt15", "5.01": "trt1", "5.03": "trt3", "5.04": "trt4",
  "5.05": "trt5", "5.06": "trt6", "5.09": "trt9", "5.10": "trt10", "5.12": "trt12",
  "4.03": "trf3", "4.01": "trf1", "4.02": "trf2", "4.04": "trf4", "4.05": "trf5", "4.06": "trf6"
};

const CNJ_PUBLIC_KEY = "APIKey c3RyYXRlZ2lhOmJhY2t1cF9kZWNpc29lc19jb25qdW50YXM=";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const numeroRaw = searchParams.get("numero") || "";
  const cleaned = numeroRaw.replace(/\D/g, "");

  if (cleaned.length !== 20) {
    return NextResponse.json(
      { error: "Número de processo inválido. O formato CNJ deve possuir 20 dígitos." },
      { status: 400 }
    );
  }

  // Parse segments for court identification
  // CNJ pattern: NNNNNNN-DD.AAAA.J.TR.OOOO (length 20: NNNNNNNDDAAAAJTROOOO)
  // J is at index 13 (14th char)
  // TR is at index 14 and 15 (15th and 16th char)
  const jDigit = cleaned.substring(13, 14);
  const trDigits = cleaned.substring(14, 16);
  const segment = `${jDigit}.${trDigits}`;

  let tribunal = TRIBUNAL_MAPPING[segment];
  if (!tribunal) {
    if (jDigit === "8") {
      tribunal = `tj${getSiglaEstado(trDigits)}`;
    } else if (jDigit === "5") {
      tribunal = `trt${parseInt(trDigits, 10)}`;
    } else if (jDigit === "4") {
      tribunal = `trf${parseInt(trDigits, 10)}`;
    } else {
      tribunal = "tjsp"; // Default fallback
    }
  }

  const formattedCNJ = `${cleaned.substring(0, 7)}-${cleaned.substring(7, 9)}.${cleaned.substring(9, 13)}.${cleaned.substring(13, 14)}.${cleaned.substring(14, 16)}.${cleaned.substring(16, 20)}`;

  try {
    const url = `https://api-publica.datajud.cnj.jus.br/api_publica_${tribunal}/_search`;
    
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": CNJ_PUBLIC_KEY
      },
      body: JSON.stringify({
        query: {
          match: {
            numeroProcesso: cleaned
          }
        }
      }),
      // Set a strict timeout so we can fallback to mock if CNJ is slow
      signal: AbortSignal.timeout(5000)
    });

    if (!response.ok) {
      throw new Error(`Datajud API returned status ${response.status}`);
    }

    const resData = await response.json();
    const hit = resData.hits?.hits?.[0]?._source;

    if (!hit) {
      return NextResponse.json(
        { error: "Nenhum processo encontrado no Datajud para este número." },
        { status: 404 }
      );
    }

    // Extract parties
    let cliente = "";
    let reclamada = "";
    const partes = hit.partes || [];

    for (const p of partes) {
      const nome = p.nome || "";
      const tipo = (p.tipoPersonagem || "").toUpperCase();

      // Plaintiff list types (Autor, Polo Ativo)
      const isAutor = ["AUTOR", "REQUERENTE", "RECLAMANTE", "EMBARGANTE", "EXEQUENTE", "POLO ATIVO", " Polo Ativo"].some(t => tipo.includes(t));
      
      // Defendant list types (Réu, Polo Passivo)
      const isReu = ["REU", "REQUERIDO", "RECLAMADO", "EMBARGADO", "EXECUTADO", "POLO PASSIVO", " Polo Passivo"].some(t => tipo.includes(t));

      if (isAutor && !cliente) {
        cliente = formatCapitalName(nome);
      } else if (isReu && !reclamada) {
        reclamada = formatCapitalName(nome);
      }
    }

    // Fallbacks
    if (!cliente && partes[0]) cliente = formatCapitalName(partes[0].nome);
    if (!reclamada && partes[1]) reclamada = formatCapitalName(partes[1].nome);

    return NextResponse.json({
      numero: formattedCNJ,
      cliente: cliente || "Cliente Indefinido",
      reclamada: reclamada || "Empresa Reclamada Indefinida",
      tribunal: tribunal.toUpperCase(),
      classe: hit.classe?.nome || "Procedimento Comum"
    });

  } catch (error) {
    console.warn("[Datajud API error, falling back to Mock]", error);
    
    // Return high-fidelity mock response if API fails/offline/timeout
    // This ensures premium UX and lets them test any CNJ formatted number instantly!
    const mockClients = ["Maria Aparecida Silva", "José Carlos dos Santos", "Ana Beatriz de Souza", "Luiz Fernando Pereira"];
    const mockDefendants = ["Banco Bradesco S/A", "Telefonica Brasil S/A", "Casas Bahia S/A", "Enel Distribuição São Paulo"];
    const mockClasses = ["Ação Trabalhista", "Procedimento Comum Cível", "Ação de Indenização", "Execução de Título Extrajudicial"];

    // Use seed based on process number digits to return stable results for the same number
    const seed = parseInt(cleaned.substring(0, 4), 10) || 0;
    const client = mockClients[seed % mockClients.length];
    const defendant = mockDefendants[(seed + 1) % mockDefendants.length];
    const action = mockClasses[(seed + 2) % mockClasses.length];

    return NextResponse.json({
      numero: formattedCNJ,
      cliente: client,
      reclamada: defendant,
      tribunal: tribunal.toUpperCase(),
      classe: action,
      isMock: true // Mark as mock so frontend knows it was simulated/fallback
    });
  }
}

// Helpers
function getSiglaEstado(trCode: string): string {
  const codes: Record<string, string> = {
    "26": "sp", "19": "rj", "13": "mg", "21": "rs", "09": "pr", "06": "ce", "17": "pe", "05": "ba", "24": "sc"
  };
  return codes[trCode] || "sp";
}

function formatCapitalName(name: string): string {
  if (!name) return "";
  return name
    .toLowerCase()
    .split(" ")
    .map(word => {
      if (["de", "da", "do", "dos", "das", "e"].includes(word)) return word;
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}
