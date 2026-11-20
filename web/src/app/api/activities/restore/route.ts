import { NextResponse } from "next/server";
import db from "@/lib/db";

type RestorableActivity = {
  id: number;
  title: string;
  start: string;
  duration: number;
  predecessors: number[];
  successors: number[];
  status: "pending" | "in-progress" | "completed" | "delayed";
  type: "task" | "milestone";
  responsible: string;
};

function isIntegerArray(value: unknown): value is number[] {
  return Array.isArray(value) && value.every(item => Number.isInteger(item) && item > 0);
}

function parseActivities(value: unknown): RestorableActivity[] | null {
  if (!Array.isArray(value) || value.length > 10000) return null;

  const activities: RestorableActivity[] = [];
  const ids = new Set<number>();
  for (const item of value) {
    if (!item || typeof item !== "object") return null;
    const activity = item as Record<string, unknown>;
    if (
      !Number.isInteger(activity.id) || Number(activity.id) < 1 ||
      typeof activity.title !== "string" ||
      typeof activity.start !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(activity.start) ||
      !Number.isInteger(activity.duration) || Number(activity.duration) < 1 ||
      !isIntegerArray(activity.predecessors) ||
      !isIntegerArray(activity.successors) ||
      !["pending", "in-progress", "completed", "delayed"].includes(String(activity.status)) ||
      !["task", "milestone"].includes(String(activity.type)) ||
      (activity.responsible !== undefined && typeof activity.responsible !== "string")
    ) return null;

    const id = Number(activity.id);
    if (ids.has(id)) return null;
    ids.add(id);
    activities.push({
      id,
      title: activity.title,
      start: activity.start,
      duration: Number(activity.duration),
      predecessors: activity.predecessors,
      successors: activity.successors,
      status: activity.status as RestorableActivity["status"],
      type: activity.type as RestorableActivity["type"],
      responsible: typeof activity.responsible === "string" ? activity.responsible : "",
    });
  }

  for (const activity of activities) {
    if (
      activity.predecessors.some(id => id === activity.id || !ids.has(id)) ||
      activity.successors.some(id => id === activity.id || !ids.has(id))
    ) return null;
  }
  return activities;
}

export async function PUT(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Solicitud JSON inválida." }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json({ message: "Solicitud JSON inválida." }, { status: 400 });
  }

  const requestBody = body as { projectId?: unknown; activities?: unknown };
  const projectId = Number(requestBody.projectId);
  if (!Number.isInteger(projectId) || projectId < 1) {
    return NextResponse.json({ message: "ID de proyecto inválido." }, { status: 400 });
  }
  if (!db.prepare("SELECT id FROM projects WHERE id = ?").get(projectId)) {
    return NextResponse.json({ message: "Proyecto no encontrado." }, { status: 404 });
  }

  const activities = parseActivities(requestBody.activities);
  if (!activities) {
    return NextResponse.json({ message: "El historial de actividades no es válido." }, { status: 400 });
  }

  const restore = db.transaction((snapshot: RestorableActivity[]) => {
    db.prepare("DELETE FROM activities WHERE project_id = ?").run(projectId);
    const insert = db.prepare(`
      INSERT INTO activities (
        id, title, start, duration, predecessors, successors, status, type, responsible, project_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const activity of snapshot) {
      insert.run(
        activity.id,
        activity.title,
        activity.start,
        activity.duration,
        JSON.stringify(activity.predecessors),
        JSON.stringify(activity.successors),
        activity.status,
        activity.type,
        activity.responsible,
        projectId,
      );
    }
  });
  restore(activities);

  return NextResponse.json({ restored: activities.length });
}
