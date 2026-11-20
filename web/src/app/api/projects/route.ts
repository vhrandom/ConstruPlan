import { NextResponse } from 'next/server';
import db from '@/lib/db';

type ProjectRow = {
  id: number;
  name: string;
  created_at: string;
  activity_count: number;
};

export async function GET() {
  const projects = db.prepare(`
    SELECT p.id, p.name, p.created_at, COUNT(a.id) AS activity_count
    FROM projects p
    LEFT JOIN activities a ON a.project_id = p.id
    GROUP BY p.id
    ORDER BY p.created_at DESC, p.id DESC
  `).all() as ProjectRow[];
  return NextResponse.json(projects);
}

export async function POST(request: Request) {
  const body = await request.json() as { name?: unknown };
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name) {
    return NextResponse.json({ message: 'El nombre del proyecto es obligatorio.' }, { status: 400 });
  }
  if (name.length > 100) {
    return NextResponse.json({ message: 'El nombre no puede superar los 100 caracteres.' }, { status: 400 });
  }

  const result = db.prepare('INSERT INTO projects (name) VALUES (?)').run(name);
  const project = db.prepare(`
    SELECT id, name, created_at, 0 AS activity_count FROM projects WHERE id = ?
  `).get(Number(result.lastInsertRowid)) as ProjectRow;
  return NextResponse.json(project, { status: 201 });
}
