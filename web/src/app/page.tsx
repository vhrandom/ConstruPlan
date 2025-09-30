// app/page.tsx
export default function HomePage() {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Bienvenido a ConstruPlan</h2>
      <p className="mb-4">Aquí puedes ver un resumen de tus actividades y planificar tu semana.</p>

      {/* Cards ejemplo */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="p-4 bg-white rounded shadow">Actividad 1</div>
        <div className="p-4 bg-white rounded shadow">Actividad 2</div>
        <div className="p-4 bg-white rounded shadow">Actividad 3</div>
      </div>
    </div>
  );
}
