"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import GanttView from "@/components/GanttView";
import ScheduleManager from "@/components/ScheduleManager";

type Project = {
  id: number;
  name: string;
  created_at: string;
  activity_count: number;
};

export default function ProjectPage() {
  const params = useParams<{ id: string }>();
  const projectId = Number(params.id);
  const [project, setProject] = useState<Project | null>(null);
  const [tasksOpen, setTasksOpen] = useState(true);
  const [mobileTasksOpen, setMobileTasksOpen] = useState(false);
  const [desktopViewport, setDesktopViewport] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const updateForViewport = () => {
      const isDesktop = window.matchMedia("(min-width: 1280px)").matches;
      setDesktopViewport(isDesktop);
      if (isDesktop) setMobileTasksOpen(false);
    };
    updateForViewport();
    window.addEventListener("resize", updateForViewport);
    return () => window.removeEventListener("resize", updateForViewport);
  }, []);

  useEffect(() => {
    if (!Number.isInteger(projectId) || projectId < 1) {
      setError("ID de proyecto inválido.");
      return;
    }
    let active = true;
    fetch(`/api/projects/${projectId}`)
      .then(async response => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "No se pudo cargar el proyecto.");
        if (active) {
          setProject(data as Project);
          setNameDraft(data.name);
        }
      })
      .catch(loadError => {
        if (active) setError(loadError instanceof Error ? loadError.message : "Error al cargar proyecto.");
      });
    return () => {
      active = false;
    };
  }, [projectId]);

  function toggleTasks() {
    if (window.matchMedia("(min-width: 1280px)").matches) {
      setTasksOpen(open => !open);
    } else {
      setMobileTasksOpen(open => !open);
    }
  }

  async function saveName(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!project || !nameDraft.trim()) return;
    setError("");
    try {
      const response = await fetch(`/api/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nameDraft }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "No se pudo renombrar el proyecto.");
      setProject(result as Project);
      setNameDraft(result.name);
      setRenaming(false);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Error al guardar el nombre.");
    }
  }

  if (error && !project) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-white">No se pudo abrir el proyecto</h1>
        <p className="mt-2 text-sm text-rose-600">{error}</p>
        <Link href="/" className="mt-5 inline-flex rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">
          Volver a proyectos
        </Link>
      </div>
    );
  }

  if (!project) {
    return <div className="p-8 text-sm text-slate-500">Cargando proyecto…</div>;
  }

  return (
    <div className="mx-auto flex min-h-full max-w-[2200px] flex-col p-3 sm:p-5">
      <header className="mb-4 flex shrink-0 flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link href="/" className="mb-3 inline-flex items-center gap-1 text-xs font-medium text-slate-500 transition hover:text-emerald-700 dark:text-slate-400 dark:hover:text-emerald-300">
            <span aria-hidden="true">←</span> Todos los proyectos
          </Link>
          {renaming ? (
            <form onSubmit={saveName} className="flex items-center gap-2">
              <input
                autoFocus
                required
                maxLength={100}
                value={nameDraft}
                onChange={event => setNameDraft(event.target.value)}
                className="h-10 min-w-0 rounded-lg border border-slate-200 bg-white px-3 text-xl font-bold text-slate-950 outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
              <button type="submit" className="h-9 rounded-lg bg-emerald-600 px-3 text-xs font-semibold text-white hover:bg-emerald-700">Guardar</button>
              <button type="button" onClick={() => { setNameDraft(project.name); setRenaming(false); }} className="h-9 rounded-lg px-2 text-xs font-medium text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">Cancelar</button>
            </form>
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-3xl">{project.name}</h1>
              <button
                type="button"
                onClick={() => setRenaming(true)}
                className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:border-emerald-300 hover:text-emerald-700 dark:border-slate-700 dark:text-slate-300"
              >
                Renombrar
              </button>
            </div>
          )}
          {error && <p role="alert" className="mt-1 text-xs text-rose-600">{error}</p>}
        </div>
      </header>

      <div className="flex min-h-0 flex-1 items-stretch gap-4">
        {tasksOpen && (
          <aside className="hidden w-[310px] shrink-0 flex-col xl:flex">
            <div className="mb-2 flex items-center justify-between px-1">
              <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Actividades</h2>
              <button
                type="button"
                onClick={() => setTasksOpen(false)}
                aria-label="Ocultar panel de actividades"
                title="Ocultar actividades"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden="true">
                  <path d="M12.5 4.5 7 10l5.5 5.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M16.5 4.5 11 10l5.5 5.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto rounded-2xl">
              <ScheduleManager projectId={project.id} />
            </div>
          </aside>
        )}

        <main className="min-w-0 flex-1">
          <div className="h-full min-h-[65vh] rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-5">
            <GanttView
              projectId={project.id}
              tasksOpen={desktopViewport ? tasksOpen : mobileTasksOpen}
              onToggleTasks={toggleTasks}
            />
          </div>
        </main>
      </div>

      {!tasksOpen && (
        <button
          type="button"
          onClick={() => setTasksOpen(true)}
          aria-label="Mostrar panel de actividades"
          title="Mostrar actividades"
          className="fixed bottom-5 left-5 z-30 hidden h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-lg transition hover:bg-emerald-50 hover:text-emerald-700 xl:flex dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
        >
          <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5" aria-hidden="true">
            <path d="M7.5 4.5 13 10l-5.5 5.5M3.5 4.5 9 10l-5.5 5.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      )}

      {mobileTasksOpen && (
        <div className="fixed inset-0 z-40 flex xl:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-slate-950/45 backdrop-blur-[1px]"
            aria-label="Cerrar panel de actividades"
            onClick={() => setMobileTasksOpen(false)}
          />
          <aside className="relative z-10 flex h-full w-[min(88vw,380px)] flex-col overflow-y-auto bg-slate-50 p-3 shadow-2xl dark:bg-slate-950">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Actividades</h2>
              <button
                type="button"
                onClick={() => setMobileTasksOpen(false)}
                aria-label="Cerrar panel de actividades"
                className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                ×
              </button>
            </div>
            <ScheduleManager projectId={project.id} />
          </aside>
        </div>
      )}
    </div>
  );
}
