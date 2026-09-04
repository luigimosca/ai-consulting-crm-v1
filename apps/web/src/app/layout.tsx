import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AI Agency - Consulenza & Soluzioni AI per Imprese e Professionisti',
  description: 'Sviluppiamo assistenti WhatsApp h24, segreterie virtuali intelligenti, agenti documentali e lead generation arricchita per Studi Professionali, HORECA ed E-commerce.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="it" className="dark">
      <body className="min-h-screen bg-[#090d16] text-slate-100 antialiased selection:bg-blue-600 selection:text-white">
        {children}
      </body>
    </html>
  );
}
