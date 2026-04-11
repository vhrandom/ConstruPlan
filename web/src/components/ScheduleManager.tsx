"use client";
import React, { useEffect, useState } from 'react';

type Activity = {
  id: number;
  title: string;
  start: string; // yyyy-mm-dd
  duration: number; // days
  predecessors?: number[];
  successors?: number[];
  status?: 'pending' | 'in-progress' | 'completed' | 'delayed';
  type?: 'task' | 'milestone';
  responsible?: string;
};

export default function ScheduleManager() {
  const [items, setItems] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [start, setStart] = useState('');
  const [duration, setDuration] = useState(5);
  const [status, setStatus] = useState<Activity['status']>('pending');
  const [type, setType] = useState<'task' | 'milestone'>('task');
  const [responsible, setResponsible] = useState('');
  const [predecessors, setPredecessors] = useState<number[]>([]);

  useEffect(() => {
    fetch('/api/activities')
      .then(r => r.json())
      .then(data => setItems(data))
      .finally(() => setLoading(false));
  }, []);

  function openNewTaskModal() {
    setEditingId(null);
    setTitle('');
    setStart(new Date().toISOString().slice(0, 10));
    setDuration(5);
    setStatus('pending');
    setType('task');
    setResponsible('');
    setPredecessors([]);
    setIsModalOpen(true);
  }

  function openEditModal(it: Activity) {
    setEditingId(it.id);
    setTitle(it.title);
    setStart(it.start);
    setDuration(it.duration);
    setStatus(it.status || 'pending');
    setType(it.type || 'task');
    setResponsible(it.responsible || '');
    setPredecessors(it.predecessors || []);
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setEditingId(null);
  }

  async function saveTask() {
    const body = {
      title: title || 'Nueva actividad',
      start,
      duration,
      predecessors,
      status,
      type,
      responsible
    };

    if (editingId) {
      // Update existing
      const res = await fetch('/api/activities', {
        method: 'PUT',
        body: JSON.stringify({ ...body, id: editingId }),
      });
      if (!res.ok) {
        alert('Error al guardar');
        return;
      }
      const updated = await res.json();
      setItems(prev => prev.map(p => (p.id === editingId ? updated : p)));
    } else {
      // Create new
      const res = await fetch('/api/activities', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      const created = await res.json();
      setItems(prev => [...prev, created]);
    }

    closeModal();
    window.dispatchEvent(new CustomEvent('activitiesChanged'));
  }

  async function remove(id: number) {
    if (!confirm('¿Estás seguro de eliminar esta tarea?')) return;
    await fetch(`/api/activities?id=${id}`, { method: 'DELETE' });
    setItems(prev => prev.filter(p => p.id !== id));
    window.dispatchEvent(new CustomEvent('activitiesChanged'));
  }

  if (loading) return <div className="p-4 text-gray-500">Cargando actividades...</div>;

  const groupedActivities = items.reduce((acc, current) => {
    if (!acc[current.start]) acc[current.start] = [];
    acc[current.start].push(current);
    return acc;
  }, {} as Record<string, Activity[]>);

  const sortedDates = Object.keys(groupedActivities).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300 p-6">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md border border-gray-100 dark:border-gray-700 p-6 transition-colors duration-300">
        <div className="flex items-center justify-between mb-6">
          {/* IZQUIERDA */}
          <button
            onClick={openNewTaskModal}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md shadow-sm transition-colors text-sm font-medium flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path>
            </svg>
            <span>Nueva Tarea</span>
          </button>

          {/* DERECHA */}
          <div className="flex gap-2">
            <button
              onClick={() => window.location.href = '/api/reports/excel'}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md shadow-sm transition-colors text-sm font-medium flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-6m6 6v-6M5 20h14a2 2 0 002-2V7l-5-5H5a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
              </svg>
              <span>Excel</span>
            </button>

            <button
              onClick={() => window.location.href = '/api/reports/pdf'}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md shadow-sm transition-colors text-sm font-medium flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 16v-4m0 0l-3 3m3-3l3 3m6 2a2 2 0 01-2 2H5a2 2 0 01-2-2"></path>
              </svg>
              <span>PDF</span>
            </button>
          </div>
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
                <span>ID: {it.id}</span>
                <span>Inicio: {it.start}</span>
                <span>Duración: {it.duration} días</span>
                {it.predecessors && it.predecessors.length > 0 && (
                  <span>Predecesores: {it.predecessors.join(', ')}</span>
                )}
              </div>
            </div>
            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <button
                onClick={() => openEditModal(it)}
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

      <hr className="my-6 border-gray-200 dark:border-gray-700" />

      <div>
        <h3 className="text-md font-semibold text-gray-700 dark:text-gray-200 mb-3">Vista Semanal</h3>
        <div className="space-y-4">
          {sortedDates.length === 0 && (
            <div className="text-sm text-gray-500 dark:text-gray-400 italic">No hay actividades para mostrar.</div>
          )}
          {sortedDates.map(date => (
            <div key={date} className="bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg p-3">
              <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-2 capitalize">
                {new Date(`${date}T12:00:00`).toLocaleDateString('es-CL', { weekday: 'long' })} ({date})
              </h4>
              <ul className="space-y-2">
                {groupedActivities[date].map(act => (
                  <li key={act.id} className="bg-white dark:bg-gray-700 border border-gray-100 dark:border-gray-600 rounded-md px-3 py-2 shadow-sm text-sm text-gray-700 dark:text-gray-200">
                    {act.title}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200 border border-transparent dark:border-gray-700">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex justify-between items-center">
              <h3 className="font-semibold text-gray-800 dark:text-gray-100">{editingId ? 'Editar Tarea' : 'Nueva Tarea'}</h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Título</label>
                <input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  placeholder="Ej: Cimentación"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Responsable</label>
                <input
                  value={responsible}
                  onChange={e => setResponsible(e.target.value)}
                  className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  placeholder="Ej: Juan Pérez"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fecha Inicio</label>
                  <input
                    type="date"
                    value={start}
                    onChange={e => setStart(e.target.value)}
                    className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Duración (días)</label>
                  <input
                    type="number"
                    min="1"
                    value={duration}
                    onChange={e => setDuration(Number(e.target.value))}
                    className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo</label>
                    <select
                      value={type}
                      onChange={e => setType(e.target.value as 'task' | 'milestone')}
                      className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      <option value="task">Tarea</option>
                      <option value="milestone">Hito</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Estado</label>
                    <select
                      value={status}
                      onChange={e => setStatus(e.target.value as Activity['status'])}
                      className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      <option value="pending">Pendiente</option>
                      <option value="in-progress">En Progreso</option>
                      <option value="completed">Completada</option>
                      <option value="delayed">Atrasada</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Predecesores</label>
                  <select
                    multiple
                    value={predecessors.map(String)}
                    onChange={e => setPredecessors(Array.from(e.target.selectedOptions).map(o => Number(o.value)))}
                    className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none text-sm h-[114px]"
                  >
                    {items.filter(i => i.id !== editingId).map(it => (
                      <option key={it.id} value={it.id}>{it.id} - {it.title}</option>
                    ))}
                  </select>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">Ctrl+Click para múltiples</p>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 flex justify-end gap-3 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={closeModal}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md text-sm font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={saveTask}
                className="px-4 py-2 bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600 text-white rounded-md text-sm font-medium shadow-sm transition-colors"
              >
                {editingId ? 'Guardar Cambios' : 'Crear Tarea'}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
