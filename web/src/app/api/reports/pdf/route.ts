import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { PDFDocument, StandardFonts } from 'pdf-lib';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const rows = db.prepare('SELECT * FROM activities').all() as any[];

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([600, 800]);

    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    let y = 750;

    const drawText = (text: string, size = 10) => {
      page.drawText(text, {
        x: 50,
        y,
        size,
        font
      });
      y -= 15;
    };

    // Título
    drawText('Reporte de Actividades - ConstruPlan', 18);
    y -= 10;

    page.drawLine({
      start: { x: 50, y },
      end: { x: 550, y },
      thickness: 1
    });
    y -= 15;

    // Indicadores
    const total = rows.length;
    const completed = rows.filter(r => r.status === 'completed').length;
    const percent = total ? Math.round((completed / total) * 100) : 0;

    drawText('RESUMEN', 12);
    y -= 5;

    drawText(`Total tareas: ${total}`);
    drawText(`Completadas: ${completed}`);
    drawText(`Avance: ${percent}%`);
    y -= 10;

    page.drawLine({
      start: { x: 50, y },
      end: { x: 550, y },
      thickness: 1
    });
    y -= 15;

    // Lista de tareas
    drawText('DETALLE DE ACTIVIDADES', 12);
    y -= 10;

    rows.forEach(row => {
      const start = new Date(row.start);
      const end = new Date(start.getTime() + row.duration * 86400000);

      drawText(`${row.id} | ${row.title}`);
      drawText(`Inicio: ${row.start} | Fin: ${end.toISOString().slice(0,10)}`);
      drawText(`Estado: ${row.status} | Tipo: ${row.type}`);
      y -= 8;
    });

    const pdfBytes = await pdfDoc.save();

    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="reporte.pdf"',
      },
    });

  } catch (error) {
    console.error('PDF ERROR:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
