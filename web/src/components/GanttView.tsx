"use client";
import React, { useEffect, useState } from 'react';

type Activity = {
  id: number;
  title: string;
  start: string;
  duration: number;
  predecessors?: number[];
  successors?: number[];
};

export default function GanttView() {
  const [items, setItems] = useState<Activity[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draftPreds, setDraftPreds] = useState<number[]>([]);

  useEffect(() => {
    const load = () => fetch('/api/activities').then(r => r.json()).then(data => setItems(data));
    load();

    const handler = () => load();
    window.addEventListener('activitiesChanged', handler as EventListener);
    return () => window.removeEventListener('activitiesChanged', handler as EventListener);
  }, []);

  function refresh() {
    fetch('/api/activities').then(r => r.json()).then(data => setItems(data));
  }

  const dayMs = 24 * 60 * 60 * 1000;

  // compute recursive start date (considering predecessors)
  function computeStartRec(act: Activity, all: Activity[], memo = new Map<number, string>(), seen = new Set<number>()): string {
    if (memo.has(act.id)) return memo.get(act.id)!;
    if (seen.has(act.id)) return act.start; // cycle protection
    // mark visited for this traversal
    const localSeen = new Set(seen);
    localSeen.add(act.id);
    if (!act.predecessors || act.predecessors.length === 0) {
      memo.set(act.id, act.start);
      return act.start;
    }
    let maxEnd = 0;
    for (const pid of act.predecessors) {
      const p = all.find(a => a.id === pid);
      if (!p) continue;
      // pass a copy of the seen set to avoid contaminating other branches
      const pStartStr = computeStartRec(p, all, memo, new Set(localSeen));
      const s = new Date(pStartStr).getTime();
      const end = s + p.duration * dayMs;
      if (end > maxEnd) maxEnd = end;
    }
    const nextStart = new Date(maxEnd + dayMs);
    const iso = nextStart.toISOString().slice(0, 10);
    memo.set(act.id, iso);
    return iso;
  }

  function dateToOffset(dateStr: string, base: Date) {
    return Math.round((new Date(dateStr).getTime() - base.getTime()) / dayMs);
  }

  function buildLayout(all: Activity[]) {
    if (!all || all.length === 0) return { base: new Date(), offsets: new Map<number, number>(), maxDays: 0 };
    // compute starts for all
    const memo = new Map<number, string>();
    for (const a of all) computeStartRec(a, all, memo, new Set<number>());
    const starts = Array.from(memo.values()).map(s => new Date(s));
    const minDate = new Date(Math.min(...starts.map(d => d.getTime())));
    const offsets = new Map<number, number>();
    let maxDays = 0;
    for (const a of all) {
      const sStr = memo.get(a.id) || a.start;
      const off = dateToOffset(sStr, minDate);
      offsets.set(a.id, off);
      if (off + a.duration > maxDays) maxDays = off + a.duration;
    }
    return { base: minDate, offsets, maxDays };
  }

  async function savePreds(id: number) {
    const res = await fetch('/api/activities', { method: 'PUT', body: JSON.stringify({ id, predecessors: draftPreds }) });
    if (!res.ok) { alert('Error saving'); return; }
    setEditingId(null);
    refresh();
    window.dispatchEvent(new CustomEvent('activitiesChanged'));
  }

  const layout = buildLayout(items);
  const dayWidth = 18;
  const rowHeight = 36;
  const labelWidth = 140;
  const svgWidth = Math.max(600, labelWidth + (layout.maxDays + 5) * dayWidth);
  const svgHeight = Math.max(200, items.length * rowHeight + 40);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm text-gray-500">Gantt Chart</div>
        <div className="flex items-center gap-2">
          <div className="text-xs text-gray-400">Timeline</div>
          <button onClick={refresh} className="px-2 py-1 bg-gray-200 rounded text-sm">Refresh</button>
        </div>
      </div>

      <div className="overflow-auto">
        <svg width={svgWidth} height={svgHeight}>
          {/* background grid */}
          <defs>
            <marker id="arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
              <path d="M0,0 L6,3 L0,6 L2,3 z" fill="#6b7280" />
            </marker>
          </defs>

          {/* timeline header: days */}
          {Array.from({ length: layout.maxDays + 1 }).map((_, i) => (
            <g key={i} transform={`translate(${labelWidth + i * dayWidth},0)`}>
              <rect x={0} y={0} width={dayWidth} height={20} fill="#f8fafc" stroke="#eee" />
              <text x={4} y={14} fontSize={10} fill="#6b7280">{i}</text>
            </g>
          ))}

          {/* dependency lines */}
          {items.map((it, idx) => {
            const off = layout.offsets.get(it.id) ?? 0;
            const y = 30 + idx * rowHeight + rowHeight / 2;
            const xStart = labelWidth + off * dayWidth;
            
            if (!it.predecessors || it.predecessors.length === 0) return null;
            return it.predecessors.map(pid => {
              const poff = layout.offsets.get(pid) ?? 0;
              const pIdx = items.findIndex(a => a.id === pid);
              if (pIdx === -1) return null;
              const py = 30 + pIdx * rowHeight + rowHeight / 2;
              const pxEnd = labelWidth + (poff + (items.find(a => a.id === pid)?.duration ?? 1)) * dayWidth;
              const sxStart = xStart;
              const path = `M ${pxEnd} ${py} C ${pxEnd + 20} ${py} ${sxStart - 20} ${y} ${sxStart} ${y}`;
              return <path key={`${pid}-${it.id}`} d={path} fill="none" stroke="#6b7280" strokeWidth={1.2} markerEnd="url(#arrow)" opacity={0.8} />;
            });
          })}

          {/* bars and labels */}
          {items.map((it, idx) => {
            const off = layout.offsets.get(it.id) ?? 0;
            const y = 30 + idx * rowHeight;
            const x = labelWidth + off * dayWidth;
            const barW = Math.max(6, it.duration * dayWidth);
            return (
              <g key={it.id}>
                <rect x={0} y={y} width={labelWidth - 8} height={rowHeight - 6} fill="#fff" />
                <text x={8} y={y + 18} fontSize={12} fill="#111">{it.id} - {it.title}</text>

                <rect x={x} y={y + 6} width={barW} height={rowHeight - 18} rx={4} fill="#10b981" opacity={0.95} />
              </g>
            );
          })}
        </svg>
      </div>

      {/* edit preds UI outside SVG */}
      {editingId !== null && (
        <div className="mt-2 p-2 border rounded bg-white">
          <div className="text-sm font-medium">Editar predecesores</div>
          <select multiple value={draftPreds.map(String)} onChange={e => setDraftPreds(Array.from(e.target.selectedOptions).map(o => Number(o.value)))} className="w-full border p-1 rounded mt-2">
            {items.filter(a => a.id !== editingId).map(a => (
              <option key={a.id} value={a.id}>{a.id} - {a.title}</option>
            ))}
          </select>
          <div className="mt-2 flex gap-2">
            <button onClick={() => savePreds(editingId)} className="px-2 py-1 bg-green-600 text-white rounded">Save</button>
            <button onClick={() => setEditingId(null)} className="px-2 py-1 bg-gray-200 rounded">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
