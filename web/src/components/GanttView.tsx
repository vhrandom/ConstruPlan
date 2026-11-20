"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ActivityEditor, { type Activity, type ActivityStatus } from "./ActivityEditor";
import {
  projectCanUndo,
  recordUndoSnapshot,
  undoHistoryChangedEvent,
  undoProjectChange,
} from "@/lib/activityHistory";

const statusColors: Record<ActivityStatus, string> = {
  pending: "#94a3b8",
  "in-progress": "#2563eb",
  completed: "#059669",
  delayed: "#dc2626",
};

const statusLabels: Record<ActivityStatus, string> = {
  pending: "Pendiente",
  "in-progress": "En progreso",
  completed: "Completada",
  delayed: "Atrasada",
};

const dayMs = 24 * 60 * 60 * 1000;

type GanttViewProps = {
  projectId: number;
  tasksOpen: boolean;
  onToggleTasks: () => void;
};

export default function GanttView({ projectId, tasksOpen, onToggleTasks }: GanttViewProps) {
  const [items, setItems] = useState<Activity[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [linkTargetId, setLinkTargetId] = useState<number | null>(null);
  const [linkPointer, setLinkPointer] = useState<{ x: number; y: number } | null>(null);
  const [saving, setSaving] = useState(false);
  const [dayWidth, setDayWidth] = useState(42);
  const [statusFilter, setStatusFilter] = useState<"all" | ActivityStatus>("all");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorActivity, setEditorActivity] = useState<Activity | null>(null);
  const [editorDraft, setEditorDraft] = useState<Activity | null>(null);
  const [canUndo, setCanUndo] = useState(false);
  const [undoing, setUndoing] = useState(false);
  const [undoError, setUndoError] = useState("");
  const dragRef = useRef<{
    id: number;
    mode: "move" | "resize" | "link";
    pointerStartX: number;
    pixelsPerDay: number;
    originalStart: string;
    originalDuration: number;
    originalItems: Activity[];
    previewStart?: string;
    previewDuration?: number;
    previewTargetId?: number;
  } | null>(null);

  const load = useCallback(async () => {
    const response = await fetch(`/api/activities?projectId=${projectId}`);
    if (!response.ok) return;
    const data = (await response.json()) as Activity[];
    setItems(data);
  }, [projectId]);

  const performUndo = useCallback(async () => {
    setUndoing(true);
    setUndoError("");
    try {
      await undoProjectChange(projectId);
    } catch (error) {
      setUndoError(error instanceof Error ? error.message : "No se pudo deshacer el cambio.");
    } finally {
      setUndoing(false);
    }
  }, [projectId]);

  useEffect(() => {
    void load();
    const handler = () => void load();
    window.addEventListener("activitiesChanged", handler as EventListener);
    return () => window.removeEventListener("activitiesChanged", handler as EventListener);
  }, [load]);

  useEffect(() => {
    const updateUndoState = (event: Event) => {
      const changedProjectId = (event as CustomEvent<{ projectId: number }>).detail?.projectId;
      if (changedProjectId === projectId) setCanUndo(projectCanUndo(projectId));
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== "z" || event.shiftKey) return;
      const target = event.target;
      if (target instanceof HTMLElement && (
        target.isContentEditable ||
        target.closest("input, textarea, select, [contenteditable='true']")
      )) return;
      if (!projectCanUndo(projectId)) return;

      event.preventDefault();
      void performUndo();
    };

    setCanUndo(projectCanUndo(projectId));
    window.addEventListener(undoHistoryChangedEvent, updateUndoState);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener(undoHistoryChangedEvent, updateUndoState);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [performUndo, projectId]);

  const visibleItems = useMemo(
    () => statusFilter === "all" ? items : items.filter(item => item.status === statusFilter),
    [items, statusFilter],
  );

  function addDays(dateStr: string, days: number) {
    const date = new Date(`${dateStr}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
  }

  function computeStartRec(
    activity: Activity,
    all: Activity[],
    memo = new Map<number, string>(),
    seen = new Set<number>(),
  ): string {
    if (memo.has(activity.id)) return memo.get(activity.id)!;
    if (seen.has(activity.id)) return activity.start;
    const localSeen = new Set(seen).add(activity.id);
    if (!activity.predecessors?.length) {
      memo.set(activity.id, activity.start);
      return activity.start;
    }

    let latestEnd = 0;
    for (const predecessorId of activity.predecessors) {
      const predecessor = all.find(item => item.id === predecessorId);
      if (!predecessor) continue;
      const predecessorStart = computeStartRec(predecessor, all, memo, localSeen);
      const predecessorEnd =
        new Date(predecessorStart).getTime() + predecessor.duration * dayMs;
      latestEnd = Math.max(latestEnd, predecessorEnd);
    }
    const computedStart = latestEnd
      ? new Date(latestEnd).toISOString().slice(0, 10)
      : activity.start;
    memo.set(activity.id, computedStart);
    return computedStart;
  }

  function buildLayout(all: Activity[]) {
    if (!all.length) {
      return { base: new Date(), offsets: new Map<number, number>(), maxDays: 0 };
    }
    const memo = new Map<number, string>();
    for (const activity of all) {
      computeStartRec(activity, all, memo, new Set<number>());
    }
    const starts = Array.from(memo.values()).map(date => new Date(`${date}T00:00:00Z`));
    const base = new Date(Math.min(...starts.map(date => date.getTime())));
    const offsets = new Map<number, number>();
    let maxDays = 0;
    for (const activity of all) {
      const start = memo.get(activity.id) || activity.start;
      const offset = Math.round(
        (new Date(`${start}T00:00:00Z`).getTime() - base.getTime()) / dayMs,
      );
      offsets.set(activity.id, offset);
      maxDays = Math.max(maxDays, offset + activity.duration);
    }
    return { base, offsets, maxDays };
  }

  const chartItems = useMemo(
    () => editorDraft ? items.map(item => item.id === editorDraft.id ? { ...item, ...editorDraft } : item) : items,
    [editorDraft, items],
  );
  const layout = buildLayout(chartItems);
  const headerHeight = 62;
  const rowHeight = 58;
  const labelWidth = 232;
  const svgWidth = Math.max(760, labelWidth + (layout.maxDays + 8) * dayWidth);
  const svgHeight = Math.max(270, visibleItems.length * rowHeight + headerHeight + 8);
  const timelineDayCount = layout.maxDays + 8;
  const monthBands: Array<{ label: string; start: number; count: number }> = [];
  for (let offset = 0; offset < timelineDayCount;) {
    const label = monthLabel(offset);
    let count = 1;
    while (offset + count < timelineDayCount && monthLabel(offset + count) === label) count++;
    monthBands.push({ label, start: offset, count });
    offset += count;
  }

  function dateAtOffset(offset: number) {
    const date = new Date(layout.base);
    date.setUTCDate(date.getUTCDate() + offset);
    return date;
  }

  function dateLabel(offset: number) {
    return dateAtOffset(offset).toLocaleDateString("es-CL", {
      weekday: "short",
      timeZone: "UTC",
    }).replace(".", "");
  }

  function monthLabel(offset: number) {
    return dateAtOffset(offset).toLocaleDateString("es-CL", {
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    });
  }

  function beginInteraction(
    event: React.PointerEvent<SVGElement>,
    activity: Activity,
    mode: "move" | "resize" | "link",
  ) {
    if (activity.type === "milestone" && mode === "resize") return;
    event.preventDefault();
    event.stopPropagation();
    const svg = event.currentTarget.ownerSVGElement;
    svg?.setPointerCapture(event.pointerId);
    const svgWidth = svg?.getBoundingClientRect().width || 1;
    dragRef.current = {
      id: activity.id,
      mode,
      pointerStartX: event.clientX,
      pixelsPerDay: dayWidth * (svgWidth / Math.max(1, labelWidth + (layout.maxDays + 8) * dayWidth)),
      originalStart: activity.start,
      originalDuration: activity.duration,
      originalItems: items.map(item => ({
        ...item,
        predecessors: [...(item.predecessors || [])],
        successors: [...(item.successors || [])],
      })),
    };
    setDraggingId(activity.id);
  }

  function moveInteraction(event: React.PointerEvent<SVGSVGElement>) {
    const drag = dragRef.current;
    if (!drag) return;

    if (drag.mode === "link") {
      const rect = event.currentTarget.getBoundingClientRect();
      const svgY = ((event.clientY - rect.top) / rect.height) * svgHeight;
      const index = Math.floor((svgY - headerHeight) / rowHeight);
      const targetId = visibleItems[index]?.id === drag.id ? null : visibleItems[index]?.id ?? null;
      drag.previewTargetId = targetId ?? undefined;
      setLinkTargetId(targetId);
      setLinkPointer({
        x: ((event.clientX - rect.left) / rect.width) * svgWidth,
        y: svgY,
      });
      return;
    }

    const dayDelta = Math.round((event.clientX - drag.pointerStartX) / drag.pixelsPerDay);

    setItems(previous => previous.map(activity => {
      if (activity.id !== drag.id) return activity;
      if (drag.mode === "resize") {
        const duration = Math.max(1, drag.originalDuration + dayDelta);
        drag.previewDuration = duration;
        return { ...activity, duration };
      }
      const start = addDays(drag.originalStart, dayDelta);
      drag.previewStart = start;
      return { ...activity, start };
    }));
  }

  async function endInteraction() {
    const drag = dragRef.current;
    if (!drag) return;
    dragRef.current = null;
    setDraggingId(null);

    if (drag.mode === "link" && drag.previewTargetId) {
      const target = items.find(activity => activity.id === drag.previewTargetId);
      if (target) {
        await saveActivity({
          id: target.id,
          predecessors: Array.from(new Set([...(target.predecessors || []), drag.id])),
        }, drag.originalItems);
      }
      setLinkTargetId(null);
      setLinkPointer(null);
      return;
    }
    setLinkTargetId(null);
    setLinkPointer(null);

    const body = drag.mode === "resize"
      ? { id: drag.id, duration: drag.previewDuration ?? drag.originalDuration }
      : drag.mode === "move"
        ? { id: drag.id, start: drag.previewStart ?? drag.originalStart }
        : null;
    if (body) await saveActivity(body, drag.originalItems);
  }

  async function saveActivity(
    partial: Partial<Activity> & { id: number },
    previousActivities: Activity[] = items,
  ): Promise<boolean> {
    const previousActivity = previousActivities.find(activity => activity.id === partial.id);
    const changed = previousActivity && Object.entries(partial).some(([key, value]) => {
      const previousValue = previousActivity[key as keyof Activity];
      return JSON.stringify(previousValue) !== JSON.stringify(value);
    });
    setSaving(true);
    try {
      const response = await fetch("/api/activities", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...partial, projectId }),
      });
      if (!response.ok) {
        const result = await response.json().catch(() => null);
        alert(result?.message === "Cycle detected"
          ? "No se puede crear esa dependencia porque formaría un ciclo."
          : "No se pudo guardar el cambio.");
        await load();
        return false;
      }
      if (changed) recordUndoSnapshot(projectId, previousActivities);
      await load();
      window.dispatchEvent(new CustomEvent("activitiesChanged"));
      return true;
    } finally {
      setSaving(false);
    }
  }

  function openInspector(activity: Activity) {
    setSelectedId(activity.id);
    setEditorActivity(activity);
    setEditorDraft({ ...activity, predecessors: [...(activity.predecessors || [])] });
    setEditorOpen(true);
  }

  async function handleEditorSaved(_activity: Activity, previousActivities: Activity[]) {
    recordUndoSnapshot(projectId, previousActivities);
    await load();
    setEditorOpen(false);
    setEditorDraft(null);
    window.dispatchEvent(new CustomEvent("activitiesChanged"));
  }

  const todayOffset = Math.round(
    (new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00Z`).getTime() - layout.base.getTime()) / dayMs,
  );

  return (
    <div className="h-full">
      <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={onToggleTasks}
            aria-label={tasksOpen ? "Ocultar actividades" : "Mostrar actividades"}
            aria-expanded={tasksOpen}
            title={tasksOpen ? "Ocultar panel de actividades" : "Mostrar panel de actividades"}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5" aria-hidden="true">
              <rect x="2.5" y="3" width="15" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" />
              <path d={tasksOpen ? "M7.5 3v14" : "M7.5 3v14M11 7l2.5 3-2.5 3"} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <div>
            <div className="text-xl font-semibold text-slate-900 dark:text-slate-100">Carta Gantt</div>
            <div className="text-sm text-slate-500 dark:text-slate-400">
              Arrastra para mover · ajusta la duración desde el borde · conecta dependencias desde el punto final
              {saving && <span className="ml-2 font-medium text-emerald-600">Guardando…</span>}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void performUndo()}
            disabled={!canUndo || undoing || saving}
            title="Deshacer último cambio (Ctrl+Z)"
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-600 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            <span aria-hidden="true">↶</span>
            <span>Deshacer</span>
          </button>
          <select
            aria-label="Filtrar por estado"
            value={statusFilter}
            onChange={event => setStatusFilter(event.target.value as "all" | ActivityStatus)}
            className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            <option value="all">Todos los estados</option>
            {Object.entries(statusLabels).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <div className="flex rounded-lg border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-800">
            {[28, 42, 56].map(width => (
              <button
                key={width}
                type="button"
                onClick={() => setDayWidth(width)}
                className={`h-7 rounded-md px-2 text-xs font-medium transition ${
                  dayWidth === width
                    ? "bg-emerald-600 text-white"
                    : "text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
                }`}
              >
                {width === 28 ? "Compacto" : width === 42 ? "Día" : "Detalle"}
              </button>
            ))}
          </div>
        </div>
        {undoError && <p role="alert" className="mb-3 text-sm text-rose-600 dark:text-rose-400">{undoError}</p>}
      </div>

      <div className="overflow-auto rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
        <svg
          width={svgWidth}
          height={svgHeight}
          onPointerMove={moveInteraction}
          onPointerUp={endInteraction}
          onPointerCancel={endInteraction}
          style={{ touchAction: "none", userSelect: "none" }}
        >
          <defs>
            <marker id="gantt-arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
              <path d="M0,0 L7,3.5 L0,7 z" fill="#64748b" />
            </marker>
          </defs>

          <rect x={0} y={0} width={svgWidth} height={headerHeight} fill="#f1f5f9" />
          <rect x={0} y={0} width={labelWidth} height={headerHeight} fill="#e2e8f0" />
          <text x={16} y={36} fontSize={12} fontWeight={700} fill="#475569">
            ACTIVIDAD / RESPONSABLE
          </text>
          {monthBands.map(band => (
            <g key={`${band.label}-${band.start}`}>
              <rect
                x={labelWidth + band.start * dayWidth}
                y={0}
                width={band.count * dayWidth}
                height={24}
                fill="#dbe4e9"
                stroke="#cbd5e1"
              />
              <text
                x={labelWidth + (band.start + band.count / 2) * dayWidth}
                y={16}
                textAnchor="middle"
                fontSize={10}
                fontWeight={700}
                fill="#047857"
              >
                {(band.count * dayWidth < 75 ? band.label.split(" ")[0] : band.label).toLocaleUpperCase("es-CL")}
              </text>
            </g>
          ))}

          {Array.from({ length: timelineDayCount }).map((_, offset) => {
            const date = dateAtOffset(offset);
            const isWeekend = date.getUTCDay() === 0 || date.getUTCDay() === 6;
            return (
              <g key={offset} transform={`translate(${labelWidth + offset * dayWidth},0)`}>
                <rect
                  x={0}
                  y={headerHeight}
                  width={dayWidth}
                  height={svgHeight - headerHeight}
                  fill={isWeekend ? "#f8fafc" : "#ffffff"}
                />
                <rect
                  x={0}
                  y={24}
                  width={dayWidth}
                  height={38}
                  fill={isWeekend ? "#e2e8f0" : "#f8fafc"}
                  stroke="#cbd5e1"
                  strokeWidth={0.75}
                />
                <text
                  x={dayWidth / 2}
                  y={37}
                  textAnchor="middle"
                  fontSize={dayWidth >= 42 ? 9 : 8}
                  fontWeight={600}
                  fill={isWeekend ? "#64748b" : "#94a3b8"}
                >
                  {dateLabel(offset).toLocaleUpperCase("es-CL")}
                </text>
                <text
                  x={dayWidth / 2}
                  y={55}
                  textAnchor="middle"
                  fontSize={14}
                  fontWeight={700}
                  fill="#334155"
                >
                  {date.getUTCDate()}
                </text>
                <line
                  x1={0}
                  x2={0}
                  y1={headerHeight}
                  y2={svgHeight}
                  stroke={isWeekend ? "#cbd5e1" : "#e2e8f0"}
                  strokeWidth={isWeekend ? 1 : 0.8}
                />
              </g>
            );
          })}

          {visibleItems.map((activity, index) => {
            const y = headerHeight + index * rowHeight;
            return (
              <g key={`row-${activity.id}`}>
                <rect
                  x={0}
                  y={y}
                  width={svgWidth}
                  height={rowHeight}
                  fill={index % 2 ? "#f8fafc" : "#ffffff"}
                  stroke="#e2e8f0"
                  strokeWidth={0.7}
                />
                <rect
                  x={0}
                  y={y}
                  width={labelWidth}
                  height={rowHeight}
                  fill={linkTargetId === activity.id
                    ? "#d1fae5"
                    : selectedId === activity.id
                      ? "#ecfdf5"
                      : index % 2 ? "#f8fafc" : "#ffffff"}
                  className="cursor-pointer"
                  onClick={() => openInspector(activity)}
                />
                <text x={14} y={y + 24} fontSize={13} fontWeight={700} fill="#334155">
                  {activity.title.length > 27 ? `${activity.title.slice(0, 27)}…` : activity.title}
                </text>
                <text x={14} y={y + 43} fontSize={10} fill="#64748b">
                  {activity.type === "milestone" ? "◆ Hito" : activity.responsible || "Sin responsable"}
                </text>
              </g>
            );
          })}

          {Array.from({ length: timelineDayCount }).map((_, offset) => {
            const date = dateAtOffset(offset);
            const isWeekend = date.getUTCDay() === 0 || date.getUTCDay() === 6;
            return (
              <g key={`grid-${offset}`} pointerEvents="none">
                {isWeekend && (
                  <rect
                    x={labelWidth + offset * dayWidth}
                    y={headerHeight}
                    width={dayWidth}
                    height={svgHeight - headerHeight}
                    fill="#e2e8f0"
                    opacity={0.45}
                  />
                )}
                <line
                  x1={labelWidth + offset * dayWidth}
                  x2={labelWidth + offset * dayWidth}
                  y1={headerHeight}
                  y2={svgHeight}
                  stroke={isWeekend ? "#cbd5e1" : "#e2e8f0"}
                  strokeWidth={isWeekend ? 1.2 : 0.8}
                />
              </g>
            );
          })}

          {todayOffset >= 0 && todayOffset <= layout.maxDays && (
            <g>
              <line
                x1={labelWidth + todayOffset * dayWidth}
                x2={labelWidth + todayOffset * dayWidth}
                y1={headerHeight}
                y2={svgHeight}
                stroke="#10b981"
                strokeWidth={2}
                opacity={0.85}
              />
              <rect
                x={labelWidth + todayOffset * dayWidth - 17}
                y={0}
                width={34}
                height={18}
                rx={5}
                fill="#10b981"
              />
              <text
                x={labelWidth + todayOffset * dayWidth}
                y={13}
                textAnchor="middle"
                fontSize={8.5}
                fontWeight={700}
                fill="#ffffff"
              >
                HOY
              </text>
            </g>
          )}

          {visibleItems.map((visibleActivity, index) => {
            const activity = chartItems.find(item => item.id === visibleActivity.id) ?? visibleActivity;
            if (!activity.predecessors?.length) return null;
            const targetOffset = layout.offsets.get(activity.id) ?? 0;
            const targetY = headerHeight + index * rowHeight + rowHeight / 2;
            const targetX = labelWidth + targetOffset * dayWidth;

            return activity.predecessors.map(predecessorId => {
              const predecessor = chartItems.find(item => item.id === predecessorId);
              if (!predecessor) return null;
              const predecessorIndex = visibleItems.findIndex(item => item.id === predecessorId);
              const predecessorOffset = layout.offsets.get(predecessorId) ?? 0;
              const predecessorY = headerHeight + predecessorIndex * rowHeight + rowHeight / 2;
              const predecessorX =
                labelWidth +
                (predecessorOffset + (predecessor.duration || 1)) * dayWidth;
              const path = `M ${predecessorX} ${predecessorY} C ${predecessorX + 24} ${predecessorY}, ${targetX - 24} ${targetY}, ${targetX} ${targetY}`;
              return (
                <path
                  key={`${predecessorId}-${activity.id}`}
                  d={path}
                  fill="none"
                  stroke={linkTargetId === activity.id ? "#10b981" : "#64748b"}
                  strokeWidth={1.5}
                  markerEnd="url(#gantt-arrow)"
                  pointerEvents="none"
                />
              );
            });
          })}

          {dragRef.current?.mode === "link" && linkPointer && (() => {
            const source = chartItems.find(item => item.id === dragRef.current?.id);
            const sourceIndex = visibleItems.findIndex(item => item.id === dragRef.current?.id);
            if (!source || sourceIndex < 0) return null;
            const sourceOffset = layout.offsets.get(source.id) ?? 0;
            const sourceX = labelWidth + (sourceOffset + source.duration) * dayWidth;
            const sourceY = headerHeight + sourceIndex * rowHeight + rowHeight / 2;
            const targetX = linkTargetId === null
              ? linkPointer.x
              : labelWidth + ((layout.offsets.get(linkTargetId) ?? 0) * dayWidth);
            const targetY = linkTargetId === null
              ? linkPointer.y
              : headerHeight + visibleItems.findIndex(item => item.id === linkTargetId) * rowHeight + rowHeight / 2;
            return (
              <path
                d={`M ${sourceX} ${sourceY} C ${sourceX + 24} ${sourceY}, ${targetX - 24} ${targetY}, ${targetX} ${targetY}`}
                fill="none"
                stroke={linkTargetId ? "#10b981" : "#f59e0b"}
                strokeWidth={2}
                strokeDasharray={linkTargetId ? undefined : "5 4"}
                markerEnd="url(#gantt-arrow)"
                pointerEvents="none"
              />
            );
          })()}

          {visibleItems.map((activity, index) => {
            const offset = layout.offsets.get(activity.id) ?? 0;
            const y = headerHeight + index * rowHeight;
            const x = labelWidth + offset * dayWidth;
            const barWidth = Math.max(10, activity.duration * dayWidth);
            const color = statusColors[activity.status || "pending"];
            const isMilestone = activity.type === "milestone";

            return (
              <g key={activity.id}>
                {isMilestone ? (
                  <polygon
                    points={`${x},${y + 10} ${x + 12},${y + 22} ${x},${y + 34} ${x - 12},${y + 22}`}
                    fill={color}
                    stroke="#ffffff"
                    strokeWidth={2}
                    className={draggingId === activity.id ? "cursor-grabbing" : "cursor-grab"}
                    onPointerDown={event => beginInteraction(event, activity, "move")}
                    onDoubleClick={() => openInspector(activity)}
                  >
                    <title>{activity.title} · {statusLabels[activity.status || "pending"]}</title>
                  </polygon>
                ) : (
                  <>
                    <rect
                      x={x}
                      y={y + 12}
                      width={barWidth}
                      height={34}
                      rx={10}
                      fill={color}
                      stroke={selectedId === activity.id ? "#0f172a" : "rgba(255,255,255,.7)"}
                      strokeWidth={selectedId === activity.id ? 2 : 1}
                      className={draggingId === activity.id ? "cursor-grabbing" : "cursor-grab"}
                      onPointerDown={event => beginInteraction(event, activity, "move")}
                      onDoubleClick={() => openInspector(activity)}
                    >
                      <title>
                        {activity.title} · {activity.duration} días · {statusLabels[activity.status || "pending"]}
                      </title>
                    </rect>
                    {barWidth > 45 && (
                      <text
                        x={x + 8}
                        y={y + 34}
                        fontSize={12}
                        fill="#ffffff"
                        fontWeight={700}
                        pointerEvents="none"
                      >
                        {activity.duration}d
                      </text>
                    )}
                    <rect
                      x={x + barWidth - 10}
                      y={y + 8}
                      width={24}
                      height={42}
                      rx={8}
                      fill="#0f172a"
                      opacity={0.48}
                      className="cursor-ew-resize"
                      onPointerDown={event => beginInteraction(event, activity, "resize")}
                    >
                      <title>Arrastra este control para cambiar los días de duración</title>
                    </rect>
                  </>
                )}
                <circle
                  cx={isMilestone ? x + 22 : x + barWidth + 18}
                  cy={y + rowHeight / 2}
                  r={7}
                  fill="#ffffff"
                  stroke="#475569"
                  strokeWidth={2}
                  className="cursor-crosshair"
                  onPointerDown={event => beginInteraction(event, activity, "link")}
                >
                  <title>Arrastra este punto hasta otra actividad para asignarla como predecesora</title>
                </circle>
              </g>
            );
          })}
        </svg>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 px-1 text-xs text-slate-500 dark:text-slate-400">
        <span className="font-medium text-slate-600 dark:text-slate-300">Estados:</span>
        {Object.entries(statusLabels).map(([status, label]) => (
          <span key={status} className="inline-flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: statusColors[status as ActivityStatus] }} />
            {label}
          </span>
        ))}
        <span className="inline-flex items-center gap-2">
          <span className="h-3 w-3 rotate-45 bg-violet-500" />
          Hito
        </span>
      </div>

      {editorOpen && (
        <ActivityEditor
          key={editorActivity?.id ?? "new"}
          projectId={projectId}
          activity={editorActivity}
          activities={items}
          onClose={() => {
            setEditorOpen(false);
            setEditorDraft(null);
          }}
          onSaved={handleEditorSaved}
          onDraftChange={setEditorDraft}
        />
      )}
    </div>
  );
}
