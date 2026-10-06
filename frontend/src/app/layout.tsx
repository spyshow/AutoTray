import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AutoTray-Router | Industrial Cable Tray & Multi-Level Riser Sizing Engine',
  description: 'Production-grade engineering web application for cable tray sizing, multi-level riser routing, and dynamic Excel mapping.',
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico', sizes: 'any' },
    ],
    apple: '/apple-icon.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen font-sans selection:bg-blue-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
