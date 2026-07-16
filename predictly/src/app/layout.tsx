import type { Metadata } from 'next';
import './globals.css';
import Navbar from '@/components/Navbar';
import WalletProvider from '@/components/WalletProvider';

export const metadata: Metadata = {
  title: 'Predictly – Prediction Markets',
  description: 'Trade on the outcome of real-world events. Prediction market platform.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* When embedded in an iframe (dashboard), hide navbar + footer */}
        <script dangerouslySetInnerHTML={{ __html: `
          try {
            if (window.self !== window.top) {
              document.documentElement.classList.add('in-iframe');
            }
          } catch(e) {
            document.documentElement.classList.add('in-iframe');
          }
        `}} />
      </head>
      <body className="min-h-screen bg-gray-950">
        <WalletProvider>
          <Navbar />
          <main className="min-h-[calc(100vh-64px)]">
            {children}
          </main>
          <footer className="border-t border-gray-800 py-8 mt-16 text-center text-gray-600 text-sm">
            <p>© 2026 Predictly — For educational purposes only. Not financial advice.</p>
          </footer>
        </WalletProvider>
      </body>
    </html>
  );
}
