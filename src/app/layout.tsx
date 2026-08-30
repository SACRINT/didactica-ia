import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SIGPDA-EMS',
  description: 'Sistema Integral de Gestión de Planeación Didáctica Automatizada — Educación Media Superior',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
