import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { generateExport } from "@/lib/export";

export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const buffer = await generateExport(session.restaurantId!);

    const filename = `fidelite_${new Date().toISOString().slice(0, 10)}.xlsx`;

    return new Response(buffer, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-cache",
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
