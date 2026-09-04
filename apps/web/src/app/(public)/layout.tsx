import React from 'react';
import { Navbar } from '@/components/public/Navbar';
import { Footer } from '@/components/public/Footer';
import { ChatbotWidget } from '@/components/public/ChatbotWidget';

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col justify-between relative bg-[#090d16]">
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
      <ChatbotWidget />
    </div>
  );
}
