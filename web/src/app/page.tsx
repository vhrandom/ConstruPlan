"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Project = {
  id: number;
  name: string;
  created_at: string;
  activity_count: number;
};

export default function HomePage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingProjectId, setDeletingProjectId] = useState<number | null>(null);
  const [error, setError] = useState("");

  async function loadProjects() {
    try {
      const response = await fetch("/api/projects");
      if (!response.ok) throw new Error("No se pudieron cargar los proyectos.");
      setProjects(await response.json());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Error al cargar proyectos.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadProjects();
  }, []);

  async function createProject(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "No se pudo crear el proyecto.");
      setProjects(current => [result as Project, ...current]);
      setName("");
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Error al crear el proyecto.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteProject(project: Project) {
    if (!window.confirm(`¿Eliminar "${project.name}"? Se eliminarán permanentemente el proyecto y todas sus actividades.`)) return;

    setDeletingProjectId(project.id);
    setError("");
    try {
      const response = await fetch(`/api/projects/${project.id}`, { method: "DELETE" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "No se pudo eliminar el proyecto.");
      setProjects(current => current.filter(item => item.id !== project.id));
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Error al eliminar el proyecto.");
    } finally {
      setDeletingProjectId(null);
    }
  }

  return (
    <div className="mx-auto min-h-full max-w-6xl px-4 py-10 sm:px-6 lg:py-16">
      <header className="mb-10 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-emerald-600">ConstruPlan</p>
          <h1 className="text-3xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-4xl">Tus proyectos</h1>
          <p className="mt-2 max-w-xl text-sm text-slate-500 dark:text-slate-400">
            Cada proyecto tiene sus propias actividades, dependencias y carta Gantt.
          </p>
        </div>
        <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300">
          <span className="font-semibold">{projects.length}</span> {projects.length === 1 ? "proyecto" : "proyectos"}
        </div>
      </header>

      <form
        onSubmit={createProject}
        className="mb-10 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:flex-row sm:items-end sm:p-5"
      >
        <label className="flex-1 text-sm font-medium text-slate-700 dark:text-slate-200">
          Crear proyecto
          <input
            required
            maxLength={100}
            value={name}
            onChange={event => setName(event.target.value)}
            placeholder="Ej.: Edificio Los Aromos"
            className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none transition focus:border-emerald-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:bg-slate-900"
          />
        </label>
        <button
          type="submit"
          disabled={saving || !name.trim()}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span className="text-lg leading-none">+</span>
          {saving ? "Creando…" : "Nuevo proyecto"}
        </button>
      </form>

      {error && (
        <p role="alert" className="mb-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300">
          {error}
        </p>
      )}

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900">
          Cargando proyectos…
        </div>
      ) : projects.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center dark:border-slate-700 dark:bg-slate-900">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-2xl text-emerald-600 dark:bg-emerald-950/40">▦</div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Aún no tienes proyectos</h2>
          <p className="mt-1 text-sm text-slate-500">Crea uno para empezar a planificar tu obra.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map(project => (
            <article
              key={project.id}
              className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-lg dark:border-slate-700 dark:bg-slate-900 dark:hover:border-emerald-700"
            >
              <Link href={`/projects/${project.id}`} className="flex-1 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">
                <div className="mb-6 flex items-start justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
                      <path d="M3.75 6.75A1.5 1.5 0 0 1 5.25 5.25h4l2 2h7.5a1.5 1.5 0 0 1 1.5 1.5v9.5a1.5 1.5 0 0 1-1.5 1.5h-13a2 2 0 0 1-2-2v-11Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    {project.activity_count} {project.activity_count === 1 ? "actividad" : "actividades"}
                  </span>
                </div>
                <h2 className="truncate text-lg font-semibold text-slate-900 transition group-hover:text-emerald-700 dark:text-white dark:group-hover:text-emerald-300">
                  {project.name}
                </h2>
                <div className="mt-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 dark:text-emerald-400">
                    Abrir Gantt <span aria-hidden="true">→</span>
                  </span>
                </div>
              </Link>
              <button
                type="button"
                onClick={() => void deleteProject(project)}
                disabled={deletingProjectId !== null}
                aria-label={`Eliminar proyecto ${project.name}`}
                className="mt-4 border-t border-slate-100 pt-3 text-left text-xs font-medium text-slate-500 transition hover:text-rose-600 disabled:cursor-wait disabled:opacity-50 dark:border-slate-800 dark:text-slate-400 dark:hover:text-rose-400"
              >
                {deletingProjectId === project.id ? "Eliminando…" : "Eliminar proyecto"}
              </button>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
