import type { Metadata, Viewport } from 'next';
import { Inter, Noto_Sans_Devanagari } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

const notoDevanagari = Noto_Sans_Devanagari({
  subsets: ['devanagari'],
  display: 'swap',
  variable: '--font-noto-devanagari',
  weight: ['400', '500', '600', '700'],
});

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
    <html lang="en" className={`dark scroll-smooth ${inter.variable} ${notoDevanagari.variable}`}>
      <body className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans antialiased selection:bg-emerald-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
