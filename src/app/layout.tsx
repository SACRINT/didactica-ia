import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'DidácticaIA',
  description: 'Plataforma de planeaciones didácticas para docentes de Puebla',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
