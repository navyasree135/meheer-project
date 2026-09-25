import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SafeTrack EHS Intelligence | Safety Observations Analytics & Corrective Actions Platform',
  description: 'Enterprise Interactive Safety Observations Dashboard featuring Kafka Event-Driven Ingestion, S3 Object Storage, Redis Caching, Predictive Forecasting, and Normalized Actions Management.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 antialiased">
        {children}
      </body>
    </html>
  );
}
