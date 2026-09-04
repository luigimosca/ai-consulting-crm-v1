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
    <div className="min-h-screen flex bg-[#070a12] text-slate-100">
      {/* Sidebar */}
      <Sidebar user={user} />

      {/* Main Content Area */}
      <main className="flex-1 p-6 sm:p-8 lg:p-10 overflow-y-auto max-h-screen">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
