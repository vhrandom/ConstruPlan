import './globals.css';
import { ReactNode } from 'react';
import Layout from '../components/Layout';
import { Montserrat } from 'next/font/google';

const montserrat = Montserrat({
  subsets: ['latin'],
  variable: '--font-montserrat',
});

export const metadata = {
  title: 'ConstruPlan',
  description: 'Gestión de planificación de construcción',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <head />
      <body className={montserrat.variable}>
        <Layout>{children}</Layout>
      </body>
    </html>
  );
}
