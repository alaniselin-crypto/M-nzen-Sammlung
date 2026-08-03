import { Coin, CoinCondition } from '../types';

const CSV_HEADER = [
  'id',
  'catalogNumber',
  'storageLocation',
  'name',
  'country',
  'faceValue',
  'currency',
  'year',
  'condition',
  'purchasePrice',
  'currentValue',
  'purchaseDate',
  'notes',
  'mintMark',
  'material',
  'weight',
  'diameter',
  'mintage',
  'imageUrl',
  'reverseImageUrl',
  'isFavorite'
].join(';');

export function exportCoinsToCSV(coins: Coin[]): string {
  const rows = coins.map(c => {
    return [
      escapeCsvCell(c.id),
      escapeCsvCell(c.catalogNumber || ''),
      escapeCsvCell(c.storageLocation || ''),
      escapeCsvCell(c.name),
      escapeCsvCell(c.country),
      escapeCsvCell(c.faceValue),
      escapeCsvCell(c.currency),
      c.year || '',
      escapeCsvCell(c.condition),
      c.purchasePrice || 0,
      c.currentValue || 0,
      escapeCsvCell(c.purchaseDate),
      escapeCsvCell(c.notes || ''),
      escapeCsvCell(c.mintMark || ''),
      escapeCsvCell(c.material || ''),
      escapeCsvCell(c.weight || ''),
      escapeCsvCell(c.diameter || ''),
      escapeCsvCell(c.mintage || ''),
      escapeCsvCell(c.imageUrl || ''),
      escapeCsvCell(c.reverseImageUrl || ''),
      c.isFavorite ? 'true' : 'false'
    ].join(';');
  });

  return [CSV_HEADER, ...rows].join('\n');
}

export function downloadCSVFile(csvContent: string, filename: string = 'muenzsammlung_backup.csv'): void {
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' }); // \ufeff for BOM UTF-8 in Excel
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function parseCSVToCoins(csvContent: string): { coins: Coin[]; errors: string[] } {
  const lines = csvContent.split(/\r?\n/).filter(line => line.trim().length > 0);
  const errors: string[] = [];
  const coins: Coin[] = [];

  if (lines.length < 2) {
    return { coins: [], errors: ['CSV-Datei enthält keine Daten oder Kopfzeile fehlt.'] };
  }

  // Detect delimiter (semicolon vs comma)
  const headerLine = lines[0];
  const delimiter = headerLine.includes(';') ? ';' : ',';

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const cells = parseCsvLine(line, delimiter);

    if (cells.length < 5) {
      errors.push(`Zeile ${i + 1} übersprungen: unvollständige Spalten.`);
      continue;
    }

    try {
      // Map cells assuming header positions
      let id, catalogNumber, storageLocation, name, country, faceValue, currency, yearStr, conditionRaw, purchasePriceStr, currentValueStr, purchaseDate, notes, mintMark, material, weight, diameter, mintage, imageUrl, reverseImageUrl, isFavoriteStr;

      if (cells.length >= 21) {
        [
          id, catalogNumber, storageLocation, name, country, faceValue, currency, yearStr, conditionRaw,
          purchasePriceStr, currentValueStr, purchaseDate, notes, mintMark,
          material, weight, diameter, mintage, imageUrl, reverseImageUrl, isFavoriteStr
        ] = cells;
      } else if (cells.length >= 19) {
        [
          id, name, country, faceValue, currency, yearStr, conditionRaw,
          purchasePriceStr, currentValueStr, purchaseDate, notes, mintMark,
          material, weight, diameter, mintage, imageUrl, reverseImageUrl, isFavoriteStr
        ] = cells;
        catalogNumber = '';
        storageLocation = '';
      } else {
        // Fallback for old CSV format without reverseImageUrl
        [
          id, name, country, faceValue, currency, yearStr, conditionRaw,
          purchasePriceStr, currentValueStr, purchaseDate, notes, mintMark,
          material, weight, diameter, mintage, imageUrl, isFavoriteStr
        ] = cells;
        catalogNumber = '';
        storageLocation = '';
        reverseImageUrl = '';
      }

      const year = parseInt(yearStr || '2000', 10);
      const purchasePrice = parseFloat((purchasePriceStr || '0').replace(',', '.'));
      const currentValue = parseFloat((currentValueStr || '0').replace(',', '.'));

      const validConditions: CoinCondition[] = ['PP', 'stgl', 'vz', 'ss', 's', 'ge'];
      const condition: CoinCondition = validConditions.includes(conditionRaw as CoinCondition)
        ? (conditionRaw as CoinCondition)
        : 'vz';

      const coin: Coin = {
        id: id || `csv-${Date.now()}-${i}`,
        catalogNumber: catalogNumber || '',
        storageLocation: storageLocation || '',
        name: name || 'Unbenannte Münze',
        country: country || 'Unbekannt',
        faceValue: faceValue || '1',
        currency: currency || 'EUR',
        year: isNaN(year) ? 2000 : year,
        condition,
        purchasePrice: isNaN(purchasePrice) ? 0 : purchasePrice,
        currentValue: isNaN(currentValue) ? 0 : currentValue,
        purchaseDate: purchaseDate || new Date().toISOString().split('T')[0],
        notes: notes || '',
        mintMark: mintMark || '',
        material: material || '',
        weight: weight || '',
        diameter: diameter || '',
        mintage: mintage || '',
        imageUrl: imageUrl || '',
        reverseImageUrl: reverseImageUrl || '',
        isFavorite: isFavoriteStr === 'true' || isFavoriteStr === '1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      coins.push(coin);
    } catch (err) {
      errors.push(`Fehler in Zeile ${i + 1}: ${(err as Error).message}`);
    }
  }

  return { coins, errors };
}

function escapeCsvCell(text: string): string {
  if (text === null || text === undefined) return '';
  const str = String(text);
  if (str.includes(';') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function parseCsvLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let cur = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      result.push(cur.trim());
      cur = '';
    } else {
      cur += char;
    }
  }
  result.push(cur.trim());
  return result;
}
