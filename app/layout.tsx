import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Saans (साँस) — Breathe Smarter Through Smog Season',
  description:
    'Grounded clean air assistant and community smog mitigation pack for Indian urban families (Delhi-NCR).',
  applicationName: 'Saans',
  authors: [{ name: 'Saans Clean Air Initiative' }],
  keywords: ['Delhi smog', 'air pollution', 'CPCB AQI', 'PM2.5', 'clean air', 'N95', 'air purifier'],
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  minimumScale: 1,
  themeColor: '#09090b',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark scroll-smooth">
      <body className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans antialiased selection:bg-emerald-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
