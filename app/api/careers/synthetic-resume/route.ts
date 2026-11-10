import { PDFDocument, StandardFonts } from "pdf-lib";
import { connection } from "next/server";
import { requireUser } from "@/lib/authorization";
import { canReadApplications } from "@/features/careers/rules";
import { careersConfig } from "@/features/careers/config";
import { intakeConfigured } from "@/features/careers/availability";
export async function GET() {
  await connection();
  if (careersConfig().mode !== "test" || !await intakeConfigured()) return new Response(null, { status: 404 });
  const user = await requireUser(); if (!canReadApplications(user)) return new Response(null, { status: 403 });
  const doc = await PDFDocument.create(); doc.setSubject("mystra-careers-synthetic"); const font = await doc.embedFont(StandardFonts.Helvetica); const page = doc.addPage(); page.drawText("SYNTHETIC RESUME - MYSTRA CAREERS TEST", { x: 40, y: 740, size: 16, font }); page.drawText("Teste Candidatura - candidato@example.test - No real personal data", { x: 40, y: 700, size: 11, font });
  return new Response(new Uint8Array(await doc.save()), { headers: { "Content-Type": "application/pdf", "Content-Disposition": 'attachment; filename="curriculo-sintetico.pdf"', "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
}
