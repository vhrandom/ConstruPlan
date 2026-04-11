import { NextResponse } from 'next/server';
import db from '@/lib/db';
import * as xlsx from 'xlsx';

export async function GET() {
  try {
    const rows = db.prepare('SELECT * FROM activities').all() as any[];

    const data = rows.map((row) => {
      const start = new Date(row.start + 'T12:00:00'); // Evitar salto de huso horario
      const end = new Date(start.getTime() + row.duration * 24 * 60 * 60 * 1000);
      
      return {
        'ID': row.id,
        'Título': row.title,
        'Fecha Inicio': row.start,
        'Duración': row.duration,
        'Fecha Fin': end.toISOString().slice(0, 10),
        'Estado': row.status,
        'Tipo': row.type || 'task'
      };
    });

    const total = rows.length;
    const completed = rows.filter(r => r.status === 'completed').length;
    const inProgress = rows.filter(r => r.status === 'in-progress').length;
    const delayed = rows.filter(r => r.status === 'delayed').length;
    const percent = total ? Math.round((completed / total) * 100) : 0;

    const summary = [
      { A: 'REPORTE DE AVANCE - CONSTRUPLAN' },
      {},
      { A: 'Total de tareas', B: total },
      { A: 'Completadas', B: completed },
      { A: 'En progreso', B: inProgress },
      { A: 'Atrasadas', B: delayed },
      { A: '% Avance', B: percent + '%' },
      {}
    ];

    const worksheet = xlsx.utils.json_to_sheet([]);

    xlsx.utils.sheet_add_json(worksheet, summary, {
      skipHeader: true,
      origin: 'A1'
    });

    xlsx.utils.sheet_add_json(worksheet, data, {
      origin: 'A10'
    });

    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Actividades');
    
    const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="reporte.xlsx"'
      }
    });
  } catch (error) {
    console.error('Error exportando Excel:', error);
    return NextResponse.json({ error: 'No se pudo generar el archivo Excel' }, { status: 500 });
  }
}
