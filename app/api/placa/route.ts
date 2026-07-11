import { NextResponse } from "next/server";
import { lookupPlaca } from "@/lib/placa";

// Consulta os dados do veículo pela placa. O token da apiplacas fica no
// servidor (lib/placa.ts), então o navegador só chama esta rota same-origin.
export async function GET(req: Request) {
  const placa = new URL(req.url).searchParams.get("placa") ?? "";
  const cleaned = placa.replace(/[^a-zA-Z0-9]/g, "");
  if (cleaned.length < 7) {
    return NextResponse.json(
      { error: "Informe uma placa válida (7 caracteres)" },
      { status: 400 },
    );
  }

  try {
    const result = await lookupPlaca(cleaned);
    if (!result) {
      return NextResponse.json(
        { error: "Não encontramos dados para esta placa" },
        { status: 404 },
      );
    }
    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: "Falha ao consultar a placa" },
      { status: 502 },
    );
  }
}
