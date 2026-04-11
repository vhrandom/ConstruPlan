import { NextResponse } from 'next/server';
import db from '@/lib/db';

type Activity = {
  id: number;
  title: string;
  start: string;
  duration: number;
  predecessors?: number[];
  successors?: number[];
  status?: 'pending' | 'in-progress' | 'completed' | 'delayed';
  type?: 'task' | 'milestone';
  responsible?: string;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseActivity(row: any): Activity {
  return {
    ...row,
    predecessors: JSON.parse(row.predecessors || '[]'),
    successors: JSON.parse(row.successors || '[]'),
  };
}

function getAllActivities(): Activity[] {
  const rows = db.prepare('SELECT * FROM activities').all();
  return rows.map(parseActivity);
}

function getActivity(id: number): Activity | undefined {
  const row = db.prepare('SELECT * FROM activities WHERE id = ?').get(id);
  if (!row) return undefined;
  return parseActivity(row);
}

// Recalculate start dates based on predecessors
function recalculateSchedule(data: Activity[]) {
  let changed = true;
  let iterations = 0;
  const maxIterations = data.length * 2;

  while (changed && iterations < maxIterations) {
    changed = false;
    iterations++;

    for (const activity of data) {
      if (!activity.predecessors || activity.predecessors.length === 0) continue;

      let maxPredEnd = 0;
      for (const pid of activity.predecessors) {
        const pred = data.find(a => a.id === pid);
        if (pred) {
          const predEnd = new Date(pred.start).getTime() + pred.duration * 24 * 60 * 60 * 1000;
          if (predEnd > maxPredEnd) {
            maxPredEnd = predEnd;
          }
        }
      }

      if (maxPredEnd > 0) {
        const newStart = new Date(maxPredEnd).toISOString().slice(0, 10);
        if (activity.start !== newStart) {
          activity.start = newStart;
          changed = true;
          // Update in DB immediately or batch later? 
          // For now, we'll update in DB at the end of the request to ensure consistency
        }
      }
    }
  }
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

export async function GET() {
  const data = getAllActivities();
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const body = (await request.json()) as Partial<Activity>;
  const data = getAllActivities();

  // Calculate next ID manually or let DB handle it? 
  // Since we need the ID for memory operations before re-fetching, let's let DB handle it 
  // but we need to insert first to get the ID.
  // However, the existing logic does cycle detection BEFORE insertion into the list.
  // Let's simulate the ID.
  const nextId = data.reduce((m, a) => Math.max(m, a.id), 0) + 1;

  const item: Activity = {
    id: nextId,
    title: body.title || 'Nueva actividad',
    start: body.start || new Date().toISOString().slice(0, 10),
    duration: body.duration || 1,
    predecessors: body.predecessors || [],
    successors: body.successors || [],
    status: body.status || 'pending',
    type: body.type || 'task',
    responsible: body.responsible || '',
  };

  // Cycle detection
  // Add item to data temporarily to check cycles
  const dataWithItem = [...data, item];
  if (item.predecessors && item.predecessors.length) {
    for (const pid of item.predecessors) {
      if (hasPath(dataWithItem, item.id, pid)) {
        return NextResponse.json({ message: 'Cycle detected' }, { status: 400 });
      }
    }
  }

  // Insert into DB
  const insert = db.prepare(`
    INSERT INTO activities (id, title, start, duration, predecessors, successors, status, type, responsible)
    VALUES (@id, @title, @start, @duration, @predecessors, @successors, @status, @type, @responsible)
  `);
  insert.run({
    ...item,
    predecessors: JSON.stringify(item.predecessors),
    successors: JSON.stringify(item.successors),
  });

  // Re-fetch data to include the new item properly and run schedule logic
  const freshData = getAllActivities();
  const freshItem = freshData.find(d => d.id === item.id)!;

  syncRelations(freshData, freshItem);
  recalculateSchedule(freshData);

  // Save all changes back to DB
  // Optimization: only save changed items. 
  // For simplicity, we can iterate and update all, or track changes.
  // Given the small scale, updating all involved is fine.
  // But let's try to be slightly efficient: update relations and schedule.

  const updateStmt = db.prepare(`
    UPDATE activities 
    SET start = @start, predecessors = @predecessors, successors = @successors
    WHERE id = @id
  `);

  const updateMany = db.transaction((activities: Activity[]) => {
    for (const act of activities) {
      updateStmt.run({
        id: act.id,
        start: act.start,
        predecessors: JSON.stringify(act.predecessors || []),
        successors: JSON.stringify(act.successors || []),
      });
    }
  });

  updateMany(freshData);

  return NextResponse.json(freshItem, { status: 201 });
}

function syncRelations(data: Activity[], item: Activity) {
  // Remove item.id from predecessors/successors of activities that no longer reference it
  for (const other of data) {
    if (other.id === item.id) continue;
    if (other.predecessors && other.predecessors.includes(item.id) && !(item.successors || []).includes(other.id)) {
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
  const data = getAllActivities();
  const idx = data.findIndex(d => d.id === body.id);

  if (idx === -1) return NextResponse.json({ message: 'Not found' }, { status: 404 });

  data[idx] = { ...data[idx], ...body } as Activity;

  // detect cycles
  if (data[idx].predecessors && data[idx].predecessors.length) {
    for (const pid of data[idx].predecessors) {
      if (hasPath(data, data[idx].id, pid)) {
        return NextResponse.json({ message: 'Cycle detected' }, { status: 400 });
      }
    }
  }

  syncRelations(data, data[idx]);
  recalculateSchedule(data);

  // Update all in DB
  const updateStmt = db.prepare(`
    UPDATE activities 
    SET title = @title, start = @start, duration = @duration, 
        predecessors = @predecessors, successors = @successors, status = @status,
        type = @type, responsible = @responsible
    WHERE id = @id
  `);

  const updateMany = db.transaction((activities: Activity[]) => {
    for (const act of activities) {
      updateStmt.run({
        id: act.id,
        title: act.title,
        start: act.start,
        duration: act.duration,
        predecessors: JSON.stringify(act.predecessors || []),
        successors: JSON.stringify(act.successors || []),
        status: act.status || 'pending',
        type: act.type || 'task',
        responsible: act.responsible || ''
      });
    }
  });

  updateMany(data);

  return NextResponse.json(data[idx]);
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = Number(searchParams.get('id'));

  // We need to fetch data first to update relations of other tasks
  const data = getAllActivities();
  const idx = data.findIndex(d => d.id === id);
  if (idx === -1) return NextResponse.json({ message: 'Not found' }, { status: 404 });

  const [removed] = data.splice(idx, 1);

  // Update relations in memory
  for (const act of data) {
    if (act.predecessors) act.predecessors = act.predecessors.filter(pid => pid !== id);
    if (act.successors) act.successors = act.successors.filter(sid => sid !== id);
  }

  recalculateSchedule(data);

  // Perform DB updates
  const deleteStmt = db.prepare('DELETE FROM activities WHERE id = ?');
  const updateStmt = db.prepare(`
    UPDATE activities 
    SET start = @start, predecessors = @predecessors, successors = @successors
    WHERE id = @id
  `);

  const transaction = db.transaction(() => {
    deleteStmt.run(id);
    for (const act of data) {
      updateStmt.run({
        id: act.id,
        start: act.start,
        predecessors: JSON.stringify(act.predecessors || []),
        successors: JSON.stringify(act.successors || []),
      });
    }
  });

  transaction();

  return NextResponse.json(removed);
}

