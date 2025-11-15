// app/layout.tsx
import './globals.css';
import { ReactNode } from 'react';
import Layout from '../components/Layout';

export const metadata = {
  title: 'ConstruPlan',
  description: 'Gestión de planificación de construcción',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <head />
      <body>
        <Layout>{children}</Layout>
      </body>
    </html>
  );
}
