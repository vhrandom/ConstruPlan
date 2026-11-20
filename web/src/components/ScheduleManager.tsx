"use client";
import React, { useCallback, useEffect, useState } from 'react';
import ActivityEditor, { type Activity } from './ActivityEditor';
import { recordUndoSnapshot } from '@/lib/activityHistory';

type ScheduleManagerProps = { projectId: number };

export default function ScheduleManager({ projectId }: ScheduleManagerProps) {
  const [items, setItems] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);

  const loadActivities = useCallback(async () => {
    try {
      const response = await fetch(`/api/activities?projectId=${projectId}`);
      if (!response.ok) throw new Error('No se pudieron cargar las actividades');
      setItems(await response.json());
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void loadActivities();
    const handler = () => void loadActivities();
    window.addEventListener('activitiesChanged', handler);
    return () => window.removeEventListener('activitiesChanged', handler);
  }, [loadActivities]);

  function openNewTaskEditor() {
    setEditingActivity(null);
    setEditorOpen(true);
  }

  function openEditEditor(activity: Activity) {
    setEditingActivity(activity);
    setEditorOpen(true);
  }

  async function handleActivitySaved(_activity: Activity, previousActivities: Activity[]) {
    recordUndoSnapshot(projectId, previousActivities);
    await loadActivities();
    setEditorOpen(false);
    window.dispatchEvent(new CustomEvent('activitiesChanged'));
  }

  async function remove(id: number) {
    if (!confirm('¿Estás seguro de eliminar esta tarea?')) return;
    const response = await fetch(`/api/activities?id=${id}&projectId=${projectId}`, { method: 'DELETE' });
    if (!response.ok) {
      alert('No se pudo eliminar la actividad.');
      return;
    }
    recordUndoSnapshot(projectId, items);
    setItems(prev => prev.filter(p => p.id !== id));
    window.dispatchEvent(new CustomEvent('activitiesChanged'));
  }

  if (loading) return <div className="p-4 text-gray-500">Cargando actividades...</div>;

  return (
    <div className="transition-colors duration-300">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-5">
        <div className="mb-5 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={openNewTaskEditor}
            className="col-span-2 inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
          >
            <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path>
            </svg>
            <span className="whitespace-nowrap">Nueva actividad</span>
          </button>

          <button
            type="button"
            onClick={() => window.location.href = `/api/reports/excel?projectId=${projectId}`}
            className="inline-flex h-9 min-w-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-slate-200 bg-white px-2 text-sm font-medium text-slate-700 transition-colors hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-emerald-700 dark:hover:bg-slate-700"
          >
            <svg className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-6m6 6v-6M5 20h14a2 2 0 002-2V7l-5-5H5a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
            </svg>
            <span>Excel</span>
          </button>

          <button
            type="button"
            onClick={() => window.location.href = `/api/reports/pdf?projectId=${projectId}`}
            className="inline-flex h-9 min-w-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-slate-200 bg-white px-2 text-sm font-medium text-slate-700 transition-colors hover:border-rose-300 hover:bg-rose-50 hover:text-rose-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-rose-700 dark:hover:bg-slate-700"
          >
            <svg className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 16v-4m0 0l-3 3m3-3l3 3m6 2a2 2 0 01-2 2H5a2 2 0 01-2-2"></path>
            </svg>
            <span>PDF</span>
          </button>
        </div>

      <div className="space-y-3">
        {items.length === 0 && (
          <div className="text-center py-8 text-gray-400 dark:text-gray-500 italic">
            No hay tareas registradas.
          </div>
        )}
        {items.map(it => (
          <div key={it.id} className="group flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-xl hover:shadow-md hover:border-blue-200 dark:hover:border-blue-400 transition-all">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-gray-900 dark:text-gray-100 tracking-tight">
                  {it.type === 'milestone' && '📍 '}{it.title}
                </span>
                {it.type === 'milestone' && (
                  <span className="text-xs px-2.5 py-1 rounded-full font-medium border bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800">
                    Hito
                  </span>
                )}
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium border ${it.status === 'completed' ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800' :
                  it.status === 'in-progress' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800' :
                    it.status === 'delayed' ? 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800' :
                      'bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600'
                  }`}>
                  {it.status === 'completed' ? 'Completada' :
                    it.status === 'in-progress' ? 'En Progreso' :
                      it.status === 'delayed' ? 'Atrasada' : 'Pendiente'}
                </span>
              </div>
              {it.responsible && (
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Responsable: {it.responsible}</div>
              )}
              <div className="text-xs text-gray-500 dark:text-gray-400 flex flex-wrap gap-3 mt-1">
                <span>Inicio: {it.start}</span>
                <span>Duración: {it.duration} días</span>
                {it.predecessors && it.predecessors.length > 0 && (
                  <span>Predecesores: {it.predecessors.join(', ')}</span>
                )}
              </div>
            </div>
            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <button
                onClick={() => openEditEditor(it)}
                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                title="Editar"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
              </button>
              <button
                onClick={() => remove(it.id)}
                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                title="Eliminar"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
              </button>
            </div>
          </div>
        ))}
      </div>

      {editorOpen && (
        <ActivityEditor
          key={editingActivity?.id ?? 'new'}
          projectId={projectId}
          activity={editingActivity}
          activities={items}
          onClose={() => setEditorOpen(false)}
          onSaved={handleActivitySaved}
        />
      )}
      </div>
    </div>
  );
}
