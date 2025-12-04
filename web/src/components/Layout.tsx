// web/src/components/Layout.tsx
"use client";
import React, { ReactNode } from 'react';
import ThemeToggle from './ThemeToggle';

type Props = {
  children: ReactNode;
};

export default function Layout({ children }: Props) {
  return (
    <div className="flex h-screen bg-gray-50">
      {/* Dark sidebar */}
      <aside className="w-20 bg-[#0b0f10] text-white flex flex-col items-center py-4 shadow-xl">
        <div className="mb-6">
          <div className="w-10 h-10 bg-green-500 rounded flex items-center justify-center font-bold">C</div>
        </div>
        <nav className="flex-1 flex flex-col items-center space-y-3">
          <button className="w-10 h-10 rounded hover:bg-white/10 flex items-center justify-center">📋</button>
          <button className="w-10 h-10 rounded hover:bg-white/10 flex items-center justify-center">📈</button>
          <button className="w-10 h-10 rounded hover:bg-white/10 flex items-center justify-center">⚙️</button>
        </nav>
        <div className="mt-4">
          <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center">JD</div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Topbar */}
        <header className="h-14 bg-white border-b flex items-center justify-between px-4 shrink-0">
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-600">101 Builder Street - Outbuild</div>
            <div className="px-3 py-1 rounded bg-green-50 text-green-700 text-sm">Construction Schedule - MAIN SCHEDULE</div>
          </div>
          <div className="flex items-center gap-3">
            <button className="px-3 py-1 bg-green-600 text-white rounded">Save</button>
            <ThemeToggle />
            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">R</div>
          </div>
        </header>

        {/* Content area */}
        <main className="flex-1 overflow-auto bg-gray-50">
          {children}
        </main>
      </div>
    </div>
  );
}
