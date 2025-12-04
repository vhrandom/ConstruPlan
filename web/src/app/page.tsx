// app/page.tsx
import ScheduleManager from '@/components/ScheduleManager';
import GanttView from '@/components/GanttView';

export default function HomePage() {
  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">ConstruPlan</h1>
        <p className="text-gray-600">Gestión eficiente de cronogramas de construcción.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4">
          <ScheduleManager />
        </div>
        <div className="lg:col-span-8">
          <div className="bg-white rounded-lg shadow-sm border p-4 h-full">
            <GanttView />
          </div>
        </div>
      </div>
    </div>
  );
}
