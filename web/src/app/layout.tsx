// app/layout.tsx
import './globals.css';
import { ReactNode } from 'react';

export const metadata = {
  title: 'ConstruPlan',
  description: 'Gestión de planificación de construcción',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <head />
      <body className="bg-gray-100">
        <div className="flex h-screen">
          {/* Sidebar */}
          <aside className="w-64 bg-white shadow-md p-4">
            <h1 className="text-xl font-bold mb-6">ConstruPlan</h1>
            <nav className="flex flex-col space-y-2">
              <a href="/" className="p-2 rounded hover:bg-gray-200">Plan Semanal</a>
              <a href="/hitos" className="p-2 rounded hover:bg-gray-200">Hitos</a>
              <a href="/gantt" className="p-2 rounded hover:bg-gray-200">Carta Gantt</a>
              <a href="/reportes" className="p-2 rounded hover:bg-gray-200">Reportes</a>
            </nav>
          </aside>

          {/* Main content */}
          <main className="flex-1 p-6 overflow-auto">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
