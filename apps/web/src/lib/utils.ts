import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const APP_VERSION = 'v1.0.0';
export const APP_BUILD = '2026.09';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatSector(sector: string): string {
  const map: Record<string, string> = {
    horeca_ristoranti: 'Ristoranti & HORECA',
    studi_legali: 'Studi Legali',
    commercialisti: 'Commercialisti & Fiscale',
    horeca_hotel: 'Hotel & Strutture Turistiche',
    ecommerce: 'E-commerce & Retail',
    local_services: 'Servizi & Attività Locali',
  };
  return map[sector] || sector;
}

export function formatStatus(status: string): string {
  const map: Record<string, string> = {
    nuovo: 'Nuovo',
    arricchito: 'Arricchito',
    in_contatto: 'In Contatto',
    qualificato: 'Qualificato',
    convertito: 'Convertito',
    perso: 'Perso',
  };
  return map[status] || status;
}

export function getStatusBadgeVariant(status: string): 'default' | 'secondary' | 'success' | 'warning' | 'destructive' | 'outline' {
  switch (status) {
    case 'nuovo':
      return 'secondary';
    case 'arricchito':
      return 'default';
    case 'in_contatto':
      return 'warning';
    case 'qualificato':
      return 'success';
    case 'convertito':
      return 'success';
    case 'perso':
      return 'destructive';
    default:
      return 'outline';
  }
}
