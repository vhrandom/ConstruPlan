import db from "@/lib/db";

export type ReportActivity = {
  id: number;
  title: string;
  start: string;
  duration: number;
  status: "pending" | "in-progress" | "completed" | "delayed";
  type: "task" | "milestone";
  responsible: string;
  predecessors: number[];
};

export type ProjectReport = {
  project: { id: number; name: string };
  activities: ReportActivity[];
};

type ActivityRow = Omit<ReportActivity, "predecessors"> & {
  predecessors: string | null;
};

export const statusLabels: Record<ReportActivity["status"], string> = {
  pending: "Pendiente",
  "in-progress": "En progreso",
  completed: "Completada",
  delayed: "Atrasada",
};

export const statusColors: Record<ReportActivity["status"], string> = {
  pending: "94A3B8",
  "in-progress": "3B82F6",
  completed: "22A06B",
  delayed: "E05252",
};

export function getProjectReport(projectId: number): ProjectReport | null {
  const project = db.prepare("SELECT id, name FROM projects WHERE id = ?").get(projectId) as ProjectReport["project"] | undefined;
  if (!project) return null;

  const rows = db.prepare(`
    SELECT id, title, start, duration, status, type, responsible, predecessors
    FROM activities
    WHERE project_id = ?
  `).all(projectId) as ActivityRow[];
  const activities = rows.map(row => ({
    ...row,
    status: row.status || "pending",
    type: row.type || "task",
    responsible: row.responsible || "",
    predecessors: JSON.parse(row.predecessors || "[]") as number[],
  })).sort((a, b) => a.start.localeCompare(b.start) || a.id - b.id);

  return { project, activities };
}

export function parseDate(date: string): Date {
  return new Date(`${date}T00:00:00.000Z`);
}

export function addDays(date: string, days: number): string {
  const result = parseDate(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result.toISOString().slice(0, 10);
}

export function finishDate(activity: Pick<ReportActivity, "start" | "duration">): string {
  return addDays(activity.start, Math.max(1, activity.duration) - 1);
}

export function getTimeline(activities: ReportActivity[]): string[] {
  if (!activities.length) return [];
  const first = activities.reduce((earliest, activity) => activity.start < earliest ? activity.start : earliest, activities[0].start);
  const last = activities.reduce((latest, activity) => {
    const finish = finishDate(activity);
    return finish > latest ? finish : latest;
  }, finishDate(activities[0]));
  const days = Math.round((parseDate(last).getTime() - parseDate(first).getTime()) / 86400000) + 1;
  return Array.from({ length: days }, (_, offset) => addDays(first, offset));
}

export function getProjectProgress(activities: ReportActivity[]) {
  const total = activities.length;
  const completed = activities.filter(activity => activity.status === "completed").length;
  return {
    total,
    completed,
    inProgress: activities.filter(activity => activity.status === "in-progress").length,
    delayed: activities.filter(activity => activity.status === "delayed").length,
    percent: total ? Math.round((completed / total) * 100) : 0,
  };
}
