import './globals.css';

import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'Wavegrid',
  description: 'Painting the sky with light',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent'
  }
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
