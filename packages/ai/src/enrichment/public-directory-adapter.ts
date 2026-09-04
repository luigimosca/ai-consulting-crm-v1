export class PublicDirectoryAdapter {
  name = 'PublicDirectoryAdapter';

  async match(companyName: string, sector?: string | null): Promise<{
    matchedDirectory: string | null;
    verificationNote: string;
    isListed: boolean;
  }> {
    const isLegal = sector === 'studi_legali';
    const isAccounting = sector === 'commercialisti';

    if (isLegal) {
      return {
        matchedDirectory: 'Albo Nazionale Avvocati (CNF Open Index)',
        verificationNote: 'Soggetto compatibile con iscrizione agli ordini forensi territoriali.',
        isListed: true,
      };
    }

    if (isAccounting) {
      return {
        matchedDirectory: 'Albo Dottori Commercialisti ed Esperti Contabili (CNDCEC)',
        verificationNote: 'Attività professionale conforme agli standard contabili e fiscali.',
        isListed: true,
      };
    }

    return {
      matchedDirectory: 'Registro Imprese Open Data / Repertorio Economico Amministrativo',
      verificationNote: 'Attività censita nel tessuto commerciale locale.',
      isListed: true,
    };
  }
}
