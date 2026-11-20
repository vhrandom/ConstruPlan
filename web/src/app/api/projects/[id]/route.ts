import { NextResponse } from 'next/server';
import db from '@/lib/db';

type RouteContext = { params: Promise<{ id: string }> };
type ProjectRow = { id: number; name: string; created_at: string; activity_count: number };

export async function GET(_request: Request, { params }: RouteContext) {
  const { id: rawId } = await params;
  const id = Number(rawId);
  if (!Number.isInteger(id) || id < 1) {
    return NextResponse.json({ message: 'ID de proyecto inválido.' }, { status: 400 });
  }

  const project = db.prepare(`
    SELECT p.id, p.name, p.created_at, COUNT(a.id) AS activity_count
    FROM projects p
    LEFT JOIN activities a ON a.project_id = p.id
    WHERE p.id = ?
    GROUP BY p.id
  `).get(id) as ProjectRow | undefined;
  if (!project) return NextResponse.json({ message: 'Proyecto no encontrado.' }, { status: 404 });
  return NextResponse.json(project);
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const { id: rawId } = await params;
  const id = Number(rawId);
  if (!Number.isInteger(id) || id < 1) {
    return NextResponse.json({ message: 'ID de proyecto inválido.' }, { status: 400 });
  }

  const body = await request.json() as { name?: unknown };
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name) {
    return NextResponse.json({ message: 'El nombre del proyecto es obligatorio.' }, { status: 400 });
  }
  if (name.length > 100) {
    return NextResponse.json({ message: 'El nombre no puede superar los 100 caracteres.' }, { status: 400 });
  }

  const result = db.prepare('UPDATE projects SET name = ? WHERE id = ?').run(name, id);
  if (result.changes === 0) {
    return NextResponse.json({ message: 'Proyecto no encontrado.' }, { status: 404 });
  }
  return GET(request, { params });
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const { id: rawId } = await params;
  const id = Number(rawId);
  if (!Number.isInteger(id) || id < 1) {
    return NextResponse.json({ message: 'ID de proyecto inválido.' }, { status: 400 });
  }

  const deleteProject = db.transaction((projectId: number) => {
    const project = db.prepare('SELECT id FROM projects WHERE id = ?').get(projectId);
    if (!project) return false;

    db.prepare('DELETE FROM activities WHERE project_id = ?').run(projectId);
    db.prepare('DELETE FROM projects WHERE id = ?').run(projectId);
    return true;
  });

  if (!deleteProject(id)) {
    return NextResponse.json({ message: 'Proyecto no encontrado.' }, { status: 404 });
  }
  return NextResponse.json({ message: 'Proyecto y actividades eliminados.' });
}
