import type { Activity } from "@/components/ActivityEditor";

const maxHistoryEntries = 50;
const undoStacks = new Map<number, Activity[][]>();
const inProgress = new Set<number>();
export const undoHistoryChangedEvent = "undoHistoryChanged";

function cloneActivities(activities: Activity[]): Activity[] {
  return activities.map(activity => ({
    ...activity,
    predecessors: [...(activity.predecessors || [])],
    successors: [...(activity.successors || [])],
  }));
}

function notify(projectId: number) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(undoHistoryChangedEvent, { detail: { projectId } }));
  }
}

export function projectCanUndo(projectId: number): boolean {
  return (undoStacks.get(projectId)?.length || 0) > 0 && !inProgress.has(projectId);
}

export function recordUndoSnapshot(projectId: number, activities: Activity[]) {
  const history = undoStacks.get(projectId) || [];
  history.push(cloneActivities(activities));
  if (history.length > maxHistoryEntries) history.shift();
  undoStacks.set(projectId, history);
  notify(projectId);
}

export async function undoProjectChange(projectId: number): Promise<boolean> {
  const history = undoStacks.get(projectId);
  const snapshot = history?.at(-1);
  if (!history || !snapshot || inProgress.has(projectId)) return false;

  inProgress.add(projectId);
  notify(projectId);
  try {
    const response = await fetch("/api/activities/restore", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, activities: snapshot }),
    });
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message || "No se pudo deshacer el cambio.");
    }

    history.pop();
    if (history.length === 0) undoStacks.delete(projectId);
    window.dispatchEvent(new CustomEvent("activitiesChanged"));
    return true;
  } finally {
    inProgress.delete(projectId);
    notify(projectId);
  }
}
