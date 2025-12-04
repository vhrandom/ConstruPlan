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
    setPredecessors([]);
    setIsModalOpen(true);
  }

  function openEditModal(it: Activity) {
    setEditingId(it.id);
    setTitle(it.title);
    setStart(it.start);
    setDuration(it.duration);
    setStatus(it.status || 'pending');
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
      status
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

  return (
    <div className="bg-white rounded-lg shadow-sm border p-4">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-800">Lista de Tareas</h2>
        <button
          onClick={openNewTaskModal}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md shadow-sm transition-colors flex items-center gap-2 text-sm font-medium"
        >
          <span>+ Nueva Tarea</span>
        </button>
      </div>

      <div className="space-y-3">
        {items.length === 0 && (
          <div className="text-center py-8 text-gray-400 italic">
            No hay tareas registradas.
          </div>
        )}
        {items.map(it => (
          <div key={it.id} className="group flex items-center justify-between p-3 border rounded-lg hover:border-blue-300 hover:shadow-sm transition-all bg-white">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-gray-900">{it.title}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full border ${it.status === 'completed' ? 'bg-green-50 text-green-700 border-green-200' :
                  it.status === 'in-progress' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                    it.status === 'delayed' ? 'bg-red-50 text-red-700 border-red-200' :
                      'bg-gray-50 text-gray-600 border-gray-200'
                  }`}>
                  {it.status === 'completed' ? 'Completada' :
                    it.status === 'in-progress' ? 'En Progreso' :
                      it.status === 'delayed' ? 'Atrasada' : 'Pendiente'}
                </span>
              </div>
              <div className="text-xs text-gray-500 flex gap-3">
                <span>ID: {it.id}</span>
                <span>Inicio: {it.start}</span>
                <span>Duración: {it.duration} días</span>
                {it.predecessors && it.predecessors.length > 0 && (
                  <span>Predecesores: {it.predecessors.join(', ')}</span>
                )}
              </div>
            </div>
            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => openEditModal(it)}
                className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                title="Editar"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
              </button>
              <button
                onClick={() => remove(it.id)}
                className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
                title="Eliminar"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
              </button>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b bg-gray-50 flex justify-between items-center">
              <h3 className="font-semibold text-gray-800">{editingId ? 'Editar Tarea' : 'Nueva Tarea'}</h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Título</label>
                <input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  placeholder="Ej: Cimentación"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Inicio</label>
                  <input
                    type="date"
                    value={start}
                    onChange={e => setStart(e.target.value)}
                    className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Duración (días)</label>
                  <input
                    type="number"
                    min="1"
                    value={duration}
                    onChange={e => setDuration(Number(e.target.value))}
                    className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                  <select
                    value={status}
                    onChange={e => setStatus(e.target.value as any)}
                    className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                  >
                    <option value="pending">Pendiente</option>
                    <option value="in-progress">En Progreso</option>
                    <option value="completed">Completada</option>
                    <option value="delayed">Atrasada</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Predecesores</label>
                  <select
                    multiple
                    value={predecessors.map(String)}
                    onChange={e => setPredecessors(Array.from(e.target.selectedOptions).map(o => Number(o.value)))}
                    className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none text-sm h-[42px]"
                  >
                    {items.filter(i => i.id !== editingId).map(it => (
                      <option key={it.id} value={it.id}>{it.id} - {it.title}</option>
                    ))}
                  </select>
                  <p className="text-[10px] text-gray-400 mt-1">Ctrl+Click para múltiples</p>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-gray-50 flex justify-end gap-3 border-t">
              <button
                onClick={closeModal}
                className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-md text-sm font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={saveTask}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium shadow-sm transition-colors"
              >
                {editingId ? 'Guardar Cambios' : 'Crear Tarea'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
