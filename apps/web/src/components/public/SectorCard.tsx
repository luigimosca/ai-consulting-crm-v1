import React from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ArrowRight, CheckCircle2, LucideIcon } from 'lucide-react';

export interface SectorCardProps {
  slug: string;
  title: string;
  category: string;
  description: string;
  solutions: string[];
  icon: LucideIcon;
  colorClass: string;
}

export function SectorCard({
  slug,
  title,
  category,
  description,
  solutions,
  icon: Icon,
  colorClass,
}: SectorCardProps) {
  return (
    <Card className="flex flex-col justify-between border-slate-800 bg-slate-900/60 hover:bg-slate-900/90 hover:border-slate-700 transition-all duration-300 group hover:-translate-y-1">
      <div>
        <CardHeader>
          <div className="flex items-center justify-between mb-2">
            <div className={`p-3 rounded-xl ${colorClass} text-white flex items-center justify-center shadow-md`}>
              <Icon className="h-6 w-6" />
            </div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 bg-slate-800/80 px-2.5 py-1 rounded-full border border-slate-700/50">
              {category}
            </span>
          </div>
          <CardTitle className="text-xl group-hover:text-blue-400 transition-colors">
            {title}
          </CardTitle>
          <p className="text-xs text-slate-400 mt-2 leading-relaxed">
            {description}
          </p>
        </CardHeader>

        <CardContent>
          <div className="space-y-2 pt-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Soluzioni AI Chiave:
            </p>
            <ul className="space-y-2 text-xs">
              {solutions.map((sol, index) => (
                <li key={index} className="flex items-start gap-2 text-slate-300">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
                  <span>{sol}</span>
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </div>

      <CardFooter>
        <Link href={`/settori/${slug}`} className="w-full">
          <Button variant="secondary" className="w-full justify-between group-hover:bg-blue-600 group-hover:text-white transition-colors">
            <span>Dettagli e Casi d&apos;Uso</span>
            <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}
