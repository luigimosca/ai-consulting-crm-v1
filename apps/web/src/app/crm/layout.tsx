import React from 'react';
import { Sidebar } from '@/components/crm/Sidebar';
import { getCurrentUser } from '@/lib/auth';

export default async function CrmLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#070a12] text-slate-100">
      {/* Sidebar (Desktop Sticky & Mobile Drawer/Bars) */}
      <Sidebar user={user} />

      {/* Main Content Area */}
      <main className="flex-1 p-3.5 sm:p-6 lg:p-8 overflow-y-auto w-full max-w-full pb-24 md:pb-8">
        <div className="max-w-7xl mx-auto w-full">
          {children}
        </div>
      </main>
    </div>
  );
}
