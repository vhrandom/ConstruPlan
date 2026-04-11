
// web/src/components/Layout.tsx
"use client";
import React, { ReactNode, useState } from 'react';
import { usePathname } from 'next/navigation';
import ThemeToggle from './ThemeToggle';

type Props = {
  children: ReactNode;
};

export default function Layout({ children }: Props) {
  const pathname = usePathname();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [user, setUser] = useState({ name: 'User Name', email: 'user@example.com' });

  React.useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  return (
    <div className={`flex h-screen transition-colors duration-300 ${pathname === '/login' ? 'login-bg-texture' : 'bg-gray-50 dark:bg-gray-900'}`}>
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
          <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center">
            {user.name.charAt(0).toUpperCase()}
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Topbar */}
        <header className={`h-14 bg-white border-b flex items-center justify-between px-4 shrink-0 ${pathname === '/login' ? '' : 'dark:bg-gray-800 dark:border-gray-700'}`}>
          <div className="flex items-center gap-4">
            {pathname === '/login' ? (
              <div className="text-lg font-semibold text-black font-montserrat">pagina principal</div>
            ) : (
              <>
                <div className="text-sm text-gray-600">101 Builder Street - Outbuild</div>
                <div className="px-3 py-1 rounded bg-green-50 text-green-700 text-sm">Construction Schedule - MAIN SCHEDULE</div>
              </>
            )}
          </div>
          <div className="flex items-center gap-3">
            {pathname !== '/login' && <button onClick={() => window.location.reload()} className="px-3 py-1 bg-blue-600 hover:bg-blue-700 transition-colors text-white rounded">Actualizar</button>}
            <ThemeToggle />

            {pathname !== '/login' && (
              <div className="relative">
                <button
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                  className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center hover:ring-2 hover:ring-green-500 transition-all focus:outline-none"
                >
                  {user.name.charAt(0).toUpperCase()}
                </button>

                {isProfileOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setIsProfileOpen(false)}
                    ></div>
                    <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-md shadow-lg py-1 border border-gray-100 z-50">
                      <div className="px-4 py-2 border-b border-gray-100">
                        <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
                        <p className="text-xs text-gray-500 truncate">{user.email}</p>
                      </div>
                      <a
                        href="/settings"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 w-full text-left"
                      >
                        Settings
                      </a>
                      <a
                        href="/login"
                        className="block px-4 py-2 text-sm text-red-600 hover:bg-red-50 w-full text-left"
                      >
                        Sign out
                      </a>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </header>

        {/* Content area */}
        <main className="flex-1 overflow-auto bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
          {children}
        </main>
      </div>
    </div>
  );
}
