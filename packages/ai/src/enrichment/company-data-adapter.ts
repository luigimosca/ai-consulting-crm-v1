import { validateItalianVatNumber } from './website-analyzer';
import { type FinancialIndicatorsData, type EnrichedField } from './types';

export class PublicCompanyDataAdapter {
  name = 'PublicCompanyDataAdapter';

  async process(input: {
    companyName: string;
    sector?: string | null;
    city?: string | null;
    extractedVat?: string | null;
    extractedPec?: string | null;
    websiteUrl?: string | null;
  }): Promise<FinancialIndicatorsData> {
    const now = new Date().toISOString();
    const { companyName, sector, extractedVat, extractedPec, websiteUrl } = input;

    // 1. Validazione e assegnazione P.IVA
    const isValidVat = extractedVat ? validateItalianVatNumber(extractedVat) : false;
    const vatField: EnrichedField<string> = {
      value: isValidVat ? extractedVat! : null,
      source: isValidVat ? 'sito_ufficiale_piva' : 'non_rilevata',
      sourceUrl: isValidVat ? websiteUrl || null : null,
      collectedAt: now,
      confidence: isValidVat ? 0.95 : 0.0,
      isEstimated: false,
      status: isValidVat ? 'official' : 'not_available',
    };

    // 2. Rilevamento Forma Giuridica
    const legalForm = this.detectLegalForm(companyName);
    const legalFormField: EnrichedField<string> = {
      value: legalForm,
      source: 'ragione_sociale_pubblica',
      sourceUrl: websiteUrl || null,
      collectedAt: now,
      confidence: legalForm !== 'Ditta Individuale / Attività Non Societaria' ? 0.9 : 0.6,
      isEstimated: legalForm === 'Ditta Individuale / Attività Non Societaria',
      status: legalForm !== 'Ditta Individuale / Attività Non Societaria' ? 'official' : 'estimated',
    };

    // 3. Stima Codice ATECO
    const atecoInfo = this.getAtecoBenchmark(sector);
    const atecoField: EnrichedField<string> = {
      value: atecoInfo.code ? `${atecoInfo.code} - ${atecoInfo.label}` : null,
      source: 'classificazione_ateco_settoriale',
      sourceUrl: 'https://www.istat.it/it/archivio/ateco-2007',
      collectedAt: now,
      confidence: 0.85,
      isEstimated: true,
      status: 'estimated',
      methodology: 'Inferenza standard basata sulla categoria di attività registrata',
    };

    // 4. Indicatori Economici: Stima benchmark per intervalli (Range)
    // Non inventiamo numeri precisi, usiamo intervalli trasparenti con confidence
    const financialEstimates = this.calculateBenchmarkRange(sector, legalForm);

    const revenueField: EnrichedField<number | string> = {
      value: financialEstimates.revenueLabel,
      min: financialEstimates.revenueMin,
      max: financialEstimates.revenueMax,
      source: 'benchmark_settoriale_istat',
      sourceUrl: 'https://dati.istat.it',
      collectedAt: now,
      confidence: 0.35,
      isEstimated: true,
      status: 'estimated',
      methodology: 'Intervallo stimato su benchmark di settore ISTAT per PMI/microimprese del territorio. Non costituisce dato di bilancio ufficiale.',
    };

    const profitField: EnrichedField<number | string> = {
      value: null,
      source: 'bilancio_ufficiale',
      sourceUrl: null,
      collectedAt: now,
      confidence: 0,
      isEstimated: false,
      status: 'not_available',
      methodology: 'Utile non desumibile da fonti aperte senza consultazione camerale a pagamento.',
    };

    const employeesField: EnrichedField<number | string> = {
      value: financialEstimates.employeesLabel,
      min: financialEstimates.employeesMin,
      max: financialEstimates.employeesMax,
      source: 'stima_organico_settore',
      sourceUrl: null,
      collectedAt: now,
      confidence: 0.4,
      isEstimated: true,
      status: 'estimated',
      methodology: 'Stima range addetti tipico per la tipologia e forma societaria.',
    };

    const taxCodeField: EnrichedField<string> = {
      value: isValidVat ? extractedVat! : null,
      source: 'registro_fiscale',
      sourceUrl: websiteUrl || null,
      collectedAt: now,
      confidence: isValidVat ? 0.9 : 0,
      isEstimated: false,
      status: isValidVat ? 'official' : 'not_available',
    };

    return {
      vatId: vatField,
      taxCode: taxCodeField,
      legalForm: legalFormField,
      atecoCode: atecoField,
      revenueType: 'estimated',
      revenue: revenueField,
      profit: profitField,
      employees: employeesField,
      notes: 'Dati economici stimati per range. Nessun bilancio ufficiale depositato interrogato.',
    };
  }

  private detectLegalForm(companyName: string): string {
    const name = companyName.toUpperCase();
    if (/\bS\.?R\.?L\.?\b|\bSRL\b|\bSOCIET[AÀ] A RESPONSABILIT[AÀ] LIMITATA\b/.test(name)) {
      if (/\bSEMPLIFICATA\b|\bS\.?R\.?L\.?S\.?\b|\bSRLS\b/.test(name)) {
        return 'S.r.l. Semplificata (S.r.l.s.)';
      }
      return 'Società a Responsabilità Limitata (S.r.l.)';
    }
    if (/\bS\.?P\.?A\.?\b|\bSPA\b|\bSOCIET[AÀ] PER AZIONI\b/.test(name)) {
      return 'Società per Azioni (S.p.a.)';
    }
    if (/\bS\.?N\.?C\.?\b|\bSNC\b|\bSOCIET[AÀ] IN NOME COLLETTIVO\b/.test(name)) {
      return 'Società in Nome Collettivo (S.n.c.)';
    }
    if (/\bS\.?A\.?S\.?\b|\bSAS\b|\bSOCIET[AÀ] IN ACCOMANDITA SEMPLICE\b/.test(name)) {
      return 'Società in Accomandita Semplice (S.a.s.)';
    }
    if (/\bSTUDIO ASSOCIATO\b|\bSTUDI ASSOCIATI\b|\bASSOCIAZIONE PROFESSIONALE\b/.test(name)) {
      return 'Studio Professionale Associato';
    }
    if (/\bSOCIET[AÀ] COOPERATIVA\b|\bS\.?C\.?A\.?R\.?L\.?\b|\bCOOP\b/.test(name)) {
      return 'Società Cooperativa';
    }
    return 'Ditta Individuale / Attività Non Societaria';
  }

  private getAtecoBenchmark(sector?: string | null): { code: string; label: string } {
    switch (sector) {
      case 'horeca_ristoranti':
        return { code: '56.10.11', label: 'Ristorazione con somministrazione' };
      case 'horeca_hotel':
        return { code: '55.10.00', label: 'Alberghi e strutture simili' };
      case 'studi_legali':
        return { code: '69.10.10', label: 'Attività degli studi legali' };
      case 'commercialisti':
        return { code: '69.20.11', label: 'Attività degli studi commerciali e tributari' };
      case 'ecommerce':
        return { code: '47.91.10', label: 'Commercio al dettaglio per corrispondenza o internet' };
      case 'local_services':
      default:
        return { code: '71.11.00', label: 'Attività di studi di architettura e ingegneria / Servizi' };
    }
  }

  private calculateBenchmarkRange(sector?: string | null, legalForm?: string): {
    revenueMin: number;
    revenueMax: number;
    revenueLabel: string;
    employeesMin: number;
    employeesMax: number;
    employeesLabel: string;
  } {
    const isCorporate = legalForm?.includes('S.r.l.') || legalForm?.includes('S.p.a.');

    if (sector === 'horeca_hotel') {
      return {
        revenueMin: 350000,
        revenueMax: 1200000,
        revenueLabel: '€350.000 - €1.200.000 (Stima)',
        employeesMin: 5,
        employeesMax: 20,
        employeesLabel: '5 - 20 addetti (Stima)',
      };
    }

    if (sector === 'horeca_ristoranti') {
      return {
        revenueMin: 180000,
        revenueMax: 600000,
        revenueLabel: '€180.000 - €600.000 (Stima)',
        employeesMin: 3,
        employeesMax: 10,
        employeesLabel: '3 - 10 addetti (Stima)',
      };
    }

    if (sector === 'studi_legali' || sector === 'commercialisti') {
      return {
        revenueMin: isCorporate ? 250000 : 80000,
        revenueMax: isCorporate ? 750000 : 300000,
        revenueLabel: isCorporate ? '€250.000 - €750.000 (Stima)' : '€80.000 - €300.000 (Stima)',
        employeesMin: isCorporate ? 4 : 1,
        employeesMax: isCorporate ? 12 : 5,
        employeesLabel: isCorporate ? '4 - 12 collaboratori (Stima)' : '1 - 5 collaboratori (Stima)',
      };
    }

    if (sector === 'ecommerce') {
      return {
        revenueMin: 150000,
        revenueMax: 800000,
        revenueLabel: '€150.000 - €800.000 (Stima)',
        employeesMin: 2,
        employeesMax: 8,
        employeesLabel: '2 - 8 addetti (Stima)',
      };
    }

    return {
      revenueMin: 100000,
      revenueMax: 400000,
      revenueLabel: '€100.000 - €400.000 (Stima)',
      employeesMin: 1,
      employeesMax: 6,
      employeesLabel: '1 - 6 addetti (Stima)',
    };
  }
}
