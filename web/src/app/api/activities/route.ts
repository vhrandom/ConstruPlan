import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Resolver la ruta del archivo de datos probando rutas candidatas para evitar casos
// donde process.cwd() pueda ser el directorio "web" o el repo raíz.
const candidates = [
  path.join(process.cwd(), 'web', 'data', 'activities.json'),
  path.join(process.cwd(), 'data', 'activities.json'),
];

const found = candidates.find(p => fs.existsSync(p));
if (!found) {
  throw new Error(`activities.json not found. Tried: ${candidates.join(', ')}`);
}
const dataPath: string = found;

type Activity = {
  id: number;
  title: string;
  start: string;
  duration: number;
  predecessors?: number[];
  successors?: number[];
};

function readData(): Activity[] {
  const raw = fs.readFileSync(dataPath, 'utf-8');
  return JSON.parse(raw) as Activity[];
}

function writeData(data: Activity[]) {
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2), 'utf-8');
}

export async function GET() {
  const data = readData();
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const body = (await request.json()) as Partial<Activity>;
  const data = readData();
  const nextId = data.reduce((m, a) => Math.max(m, a.id), 0) + 1;
  const item: Activity = {
    id: nextId,
    title: body.title || 'Nueva actividad',
    start: body.start || new Date().toISOString().slice(0, 10),
    duration: body.duration || 1,
    predecessors: body.predecessors || [],
    successors: body.successors || [],
  };
  // detect cycles: adding edges pid -> item.id would create a cycle if there exists a path item.id -> pid
  data.push(item);
  if (item.predecessors && item.predecessors.length) {
    for (const pid of item.predecessors) {
      if (hasPath(data, item.id, pid)) {
        return NextResponse.json({ message: 'Cycle detected' }, { status: 400 });
      }
    }
  }
  // ensure relations updated
  syncRelations(data, item);
  writeData(data);
  return NextResponse.json(item, { status: 201 });
}

function syncRelations(data: Activity[], item: Activity) {
  // Remove item.id from predecessors/successors of activities that no longer reference it
  for (const other of data) {
    if (other.id === item.id) continue;
    if (other.predecessors && other.predecessors.includes(item.id) && !(item.successors || []).includes(other.id)) {
      // If other lists item as predecessor but item doesn't list other as successor, remove
      other.predecessors = other.predecessors.filter(x => x !== item.id);
    }
    if (other.successors && other.successors.includes(item.id) && !(item.predecessors || []).includes(other.id)) {
      other.successors = other.successors.filter(x => x !== item.id);
    }
  }

  // Ensure predecessors point to item via successors
  if (item.predecessors && item.predecessors.length) {
    for (const pid of item.predecessors) {
      const p = data.find(d => d.id === pid);
      if (p) {
        p.successors = Array.from(new Set([...(p.successors || []), item.id]));
      }
    }
  }
  // Ensure successors point to item via predecessors
  if (item.successors && item.successors.length) {
    for (const sid of item.successors) {
      const s = data.find(d => d.id === sid);
      if (s) {
        s.predecessors = Array.from(new Set([...(s.predecessors || []), item.id]));
      }
    }
  }
}

export async function PUT(request: Request) {
  const body = (await request.json()) as Partial<Activity> & { id: number };
  const data = readData();
  const idx = data.findIndex(d => d.id === body.id);
  if (idx === -1) return NextResponse.json({ message: 'Not found' }, { status: 404 });
  data[idx] = { ...data[idx], ...body } as Activity;
  // detect cycles after applying the update: for each predecessor, check path item.id -> pid
  if (data[idx].predecessors && data[idx].predecessors.length) {
    for (const pid of data[idx].predecessors) {
      if (hasPath(data, data[idx].id, pid)) {
        return NextResponse.json({ message: 'Cycle detected' }, { status: 400 });
      }
    }
  }
  // ensure relations are consistent
  syncRelations(data, data[idx]);
  writeData(data);
  return NextResponse.json(data[idx]);
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = Number(searchParams.get('id'));
  const data = readData();
  const idx = data.findIndex(d => d.id === id);
  if (idx === -1) return NextResponse.json({ message: 'Not found' }, { status: 404 });
  const [removed] = data.splice(idx, 1);
  writeData(data);
  return NextResponse.json(removed);
}

// detect if there exists a path from startId to targetId following successors
function hasPath(data: Activity[], startId: number, targetId: number) {
  const visited = new Set<number>();
  const stack = [startId];
  while (stack.length) {
    const cur = stack.pop()!;
    if (cur === targetId) return true;
    if (visited.has(cur)) continue;
    visited.add(cur);
    const node = data.find(d => d.id === cur);
    if (!node || !node.successors) continue;
    for (const s of node.successors) {
      if (!visited.has(s)) stack.push(s);
    }
  }
  return false;
}
