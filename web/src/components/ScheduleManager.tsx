-"use client";
import React, { useEffect, useState } from 'react';

type Activity = {
  id: number;
  title: string;
  start: string; // yyyy-mm-dd
  duration: number; // days
  predecessors?: number[];
  successors?: number[];
};

export default function ScheduleManager() {
  const [items, setItems] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [duration, setDuration] = useState(5);
  const [predecessors, setPredecessors] = useState<number[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState<Partial<Activity>>({});

  useEffect(() => {
    fetch('/api/activities')
      .then(r => r.json())
      .then(data => setItems(data))
      .finally(() => setLoading(false));
  }, []);

  async function add() {
    const start = new Date().toISOString().slice(0, 10);
    const res = await fetch('/api/activities', {
      method: 'POST',
      body: JSON.stringify({ title: title || 'Nueva actividad', start, duration, predecessors }),
    });
    const created = await res.json();
    setItems(prev => [...prev, created]);
    setTitle('');
    setPredecessors([]);
    // notify other components
    window.dispatchEvent(new CustomEvent('activitiesChanged'));
  }

  function startEdit(it: Activity) {
    setEditingId(it.id);
    setDraft({ ...it });
    setPredecessors(it.predecessors || []);
  }

  function cancelEdit() {
    setEditingId(null);
    setDraft({});
  }

  async function confirmEdit(id: number) {
    const body = { ...draft, id } as Partial<Activity> & { id: number };
    const res = await fetch('/api/activities', {
      method: 'PUT',
      body: JSON.stringify({ ...body, predecessors: predecessors }),
    });
    if (!res.ok) {
      // simple error handling
      alert('Error al guardar');
      return;
    }
    const updated = await res.json();
    setItems(prev => prev.map(p => (p.id === id ? updated : p)));
    setEditingId(null);
    setDraft({});
    window.dispatchEvent(new CustomEvent('activitiesChanged'));
  }

  async function remove(id: number) {
    await fetch(`/api/activities?id=${id}`, { method: 'DELETE' });
    setItems(prev => prev.filter(p => p.id !== id));
    window.dispatchEvent(new CustomEvent('activitiesChanged'));
  }

  if (loading) return <div>Cargando actividades...</div>;

  return (
    <div>
      <div className="mb-3 flex flex-col gap-2">
        <div className="flex gap-2">
          <input value={title} onChange={e => setTitle(e.target.value)} className="border p-1 rounded flex-1" placeholder="Título" />
          <input type="number" value={duration} onChange={e => setDuration(Number(e.target.value))} className="w-20 border p-1 rounded" />
          <button onClick={add} className="px-3 py-1 bg-blue-600 text-white rounded">Añadir</button>
        </div>
        <div>
          <label className="text-xs mr-2">Predecessors</label>
          <select multiple value={predecessors.map(String)} onChange={e => setPredecessors(Array.from(e.target.selectedOptions).map(o => Number(o.value)))} className="w-full border p-1 rounded">
            {items.map(it => (
              <option key={it.id} value={it.id}>{it.id} - {it.title}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-2">
        {items.map(it => (
          <div key={it.id} className="flex items-center justify-between p-2 border rounded">
            <div className="flex-1">
              {editingId === it.id ? (
                <div className="flex gap-2 items-center">
                  <input className="border p-1 rounded flex-1" value={String(draft.title ?? '')} onChange={e => setDraft(d => ({ ...d, title: e.target.value }))} />
                  <input className="w-28 border p-1 rounded" value={String(draft.start ?? '')} onChange={e => setDraft(d => ({ ...d, start: e.target.value }))} />
                  <input className="w-20 border p-1 rounded" type="number" value={Number(draft.duration ?? 0)} onChange={e => setDraft(d => ({ ...d, duration: Number(e.target.value) }))} />
                </div>
              ) : (
                <div>
                  <div className="font-medium cursor-pointer" onClick={() => startEdit(it)}>{it.title}</div>
                  <div className="text-xs text-gray-500">{it.start} · {it.duration} días</div>
                </div>
              )}
            </div>
            <div className="flex gap-2 items-center">
              {editingId === it.id ? (
                <>
                  <button onClick={() => confirmEdit(it.id)} className="px-2 py-1 bg-green-600 text-white rounded text-sm">Confirmar</button>
                  <button onClick={cancelEdit} className="px-2 py-1 bg-gray-200 rounded text-sm">Cancelar</button>
                </>
              ) : (
                <>
                  <button onClick={() => startEdit(it)} className="px-2 py-1 bg-yellow-300 rounded text-sm">Editar</button>
                  <button onClick={() => remove(it.id)} className="text-red-600">Eliminar</button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Gantt preview removed from ScheduleManager - main Gantt is on the right */}
    </div>
  );
}
