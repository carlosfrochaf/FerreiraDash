import { NextResponse } from "next/server";
import { tribunalDoProcesso } from "@/lib/tribunais";

// Chave pública do CNJ. Ela muda de tempos em tempos: a atual fica em
// https://datajud-wiki.cnj.jus.br/api-publica/acesso e vai na variável DATAJUD_API_KEY.
const CHAVE_PADRAO = "cDZHYzlZa0JadVREZDJCendQbXY6SkJlTzNjLV9TRENyQk1RdnFKZGRQdw==";

function chaveDatajud(): string {
  const k = (process.env.DATAJUD_API_KEY || CHAVE_PADRAO).trim();
  return k.startsWith("APIKey ") ? k : `APIKey ${k}`;
}

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

  // Número CNJ: NNNNNNN-DD.AAAA.J.TR.OOOO (J no índice 13, TR em 14-15)
  const tribunal = tribunalDoProcesso(cleaned.substring(13, 14), cleaned.substring(14, 16));
  if (!tribunal) {
    return NextResponse.json({ error: "Tribunal deste processo não é atendido pela busca do Datajud." }, { status: 400 });
  }

  const formattedCNJ = `${cleaned.substring(0, 7)}-${cleaned.substring(7, 9)}.${cleaned.substring(9, 13)}.${cleaned.substring(13, 14)}.${cleaned.substring(14, 16)}.${cleaned.substring(16, 20)}`;

  try {
    const url = `https://api-publica.datajud.cnj.jus.br/api_publica_${tribunal}/_search`;
    
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": chaveDatajud()
      },
      body: JSON.stringify({
        query: {
          match: {
            numeroProcesso: cleaned
          }
        }
      }),
      signal: AbortSignal.timeout(8000)
    });

    if (response.status === 401 || response.status === 403) {
      console.error("[Datajud] chave recusada pelo CNJ (status", response.status, ")");
      return NextResponse.json(
        { error: "O CNJ recusou a chave do Datajud (ela muda de tempos em tempos). Atualize DATAJUD_API_KEY no Render." },
        { status: 502 }
      );
    }
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
      cliente: cliente || "",
      reclamada: reclamada || "",
      tribunal: tribunal.toUpperCase(),
      classe: hit.classe?.nome || "Procedimento Comum"
    });

  } catch (error) {
    // Nunca inventar dados: se o CNJ falhar, o usuário preenche à mão.
    console.warn("[Datajud] falha na consulta", error);
    return NextResponse.json(
      { error: "Não foi possível consultar o Datajud agora. Preencha cliente e empresa manualmente." },
      { status: 502 }
    );
  }
}

// Helpers
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
