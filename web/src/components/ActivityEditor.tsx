"use client";

import { useState } from "react";

export type ActivityStatus = "pending" | "in-progress" | "completed" | "delayed";

export type Activity = {
  id: number;
  title: string;
  start: string;
  duration: number;
  predecessors?: number[];
  successors?: number[];
  status?: ActivityStatus;
  type?: "task" | "milestone";
  responsible?: string;
};

type Props = {
  projectId: number;
  activity: Activity | null;
  activities: Activity[];
  onClose: () => void;
  onSaved: (activity: Activity, previousActivities: Activity[]) => void | Promise<void>;
  onDraftChange?: (activity: Activity) => void;
};

function createDraft(activity: Activity | null): Activity {
  return activity
    ? { ...activity, predecessors: [...(activity.predecessors || [])] }
    : {
        id: 0,
        title: "",
        start: new Date().toISOString().slice(0, 10),
        duration: 5,
        predecessors: [],
        status: "pending",
        type: "task",
        responsible: "",
      };
}

const fieldClass =
  "mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100";

export default function ActivityEditor({
  projectId,
  activity,
  activities,
  onClose,
  onSaved,
  onDraftChange,
}: Props) {
  const [draft, setDraft] = useState(() => createDraft(activity));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function updateDraft(changes: Partial<Activity>) {
    const updated = { ...draft, ...changes };
    setDraft(updated);
    onDraftChange?.(updated);
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.title.trim()) {
      setError("Ingresa el nombre de la actividad.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const isEditing = activity !== null;
      const payload = {
        ...draft,
        title: draft.title.trim(),
        duration: draft.type === "milestone" ? 1 : Math.max(1, draft.duration),
      };
      const response = await fetch("/api/activities", {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, projectId }),
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.message === "Cycle detected"
          ? "Esta relación crearía una dependencia circular."
          : result.message || "No se pudo guardar la actividad.");
        return;
      }
      await onSaved(result as Activity, activities);
    } catch {
      setError("No se pudo guardar la actividad. Comprueba tu conexión e inténtalo de nuevo.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
      onMouseDown={event => {
        if (event.target === event.currentTarget && !saving) onClose();
      }}
    >
      <form
        onSubmit={save}
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white/95 px-5 py-4 backdrop-blur dark:border-slate-700 dark:bg-slate-900/95 sm:px-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              {activity ? "Editar actividad" : "Nueva actividad"}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {activity ? `Actividad #${activity.id}` : "Completa los datos de planificación"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Cerrar editor"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-xl text-slate-400 hover:bg-slate-100 disabled:opacity-50 dark:hover:bg-slate-800"
          >
            ×
          </button>
        </div>

        <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
          <label className="text-xs font-medium text-slate-600 dark:text-slate-300 sm:col-span-2">
            Nombre de la actividad
            <input
              autoFocus
              required
              value={draft.title}
              onChange={event => updateDraft({ title: event.target.value })}
              placeholder="Ej.: Preparación de terreno"
              className={fieldClass}
            />
          </label>

          <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
            Responsable
            <input
              value={draft.responsible || ""}
              onChange={event => updateDraft({ responsible: event.target.value })}
              placeholder="Nombre del responsable"
              className={fieldClass}
            />
          </label>

          <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
            Estado
            <select
              value={draft.status || "pending"}
              onChange={event => updateDraft({ status: event.target.value as ActivityStatus })}
              className={fieldClass}
            >
              <option value="pending">Pendiente</option>
              <option value="in-progress">En progreso</option>
              <option value="completed">Completada</option>
              <option value="delayed">Atrasada</option>
            </select>
          </label>

          <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
            Fecha de inicio
            <input
              type="date"
              required
              value={draft.start}
              onChange={event => updateDraft({ start: event.target.value })}
              className={fieldClass}
            />
          </label>

          <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
            Duración (días)
            <input
              type="number"
              min={1}
              disabled={draft.type === "milestone"}
              value={draft.type === "milestone" ? 1 : draft.duration}
              onChange={event => updateDraft({ duration: Math.max(1, Number(event.target.value)) })}
              className={`${fieldClass} disabled:opacity-50`}
            />
          </label>

          <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
            Tipo
            <select
              value={draft.type || "task"}
              onChange={event => {
                const type = event.target.value as "task" | "milestone";
                updateDraft({ type, duration: type === "milestone" ? 1 : draft.duration });
              }}
              className={fieldClass}
            >
              <option value="task">Actividad</option>
              <option value="milestone">Hito</option>
            </select>
          </label>

          <fieldset className="text-xs font-medium text-slate-600 dark:text-slate-300 sm:col-span-2">
            <div className="flex items-center justify-between">
              <legend>Predecesores</legend>
              <button
                type="button"
                disabled={!draft.predecessors?.length}
                onClick={() => updateDraft({ predecessors: [] })}
                className="text-[11px] font-semibold text-rose-600 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Quitar todos
              </button>
            </div>
            <div className="mt-2 grid max-h-36 gap-1 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-2 sm:grid-cols-2 dark:border-slate-700 dark:bg-slate-950">
              {activities.filter(item => item.id !== activity?.id).map(item => {
                const checked = (draft.predecessors || []).includes(item.id);
                return (
                  <label
                    key={item.id}
                    className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 hover:bg-white dark:hover:bg-slate-800"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => updateDraft({
                        predecessors: checked
                          ? (draft.predecessors || []).filter(id => id !== item.id)
                          : [...(draft.predecessors || []), item.id],
                      })}
                      className="h-4 w-4 shrink-0 cursor-pointer accent-emerald-600"
                    />
                    <span className="truncate">{item.title}</span>
                  </label>
                );
              })}
              {activities.filter(item => item.id !== activity?.id).length === 0 && (
                <span className="px-2 py-2 text-slate-400">Agrega otra actividad para definir predecesores.</span>
              )}
            </div>
          </fieldset>

          {error && (
            <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 sm:col-span-2 dark:bg-rose-950/40 dark:text-rose-300">
              {error}
            </p>
          )}
        </div>

        <div className="sticky bottom-0 flex justify-end gap-2 border-t border-slate-200 bg-white/95 px-5 py-4 backdrop-blur dark:border-slate-700 dark:bg-slate-900/95 sm:px-6">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="h-10 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60"
          >
            {saving ? "Guardando…" : activity ? "Guardar cambios" : "Crear actividad"}
          </button>
        </div>
      </form>
    </div>
  );
}
