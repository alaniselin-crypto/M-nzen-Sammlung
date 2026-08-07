import { Coin, CoinCondition } from '../types';
import { formatSKU, getCoinTitle } from './storage';

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

export function downloadCSVTemplate(): void {
  const sampleCoins: Coin[] = [
    {
      id: 'muster-1',
      catalogNumber: 'CH-2026-01',
      storageLocation: 'Schatulle A',
      name: '5 CHF 1968 Biber',
      country: 'Schweiz',
      faceValue: '5',
      currency: 'CHF',
      year: 1968,
      condition: 'stgl',
      purchasePrice: 15.00,
      currentValue: 25.00,
      purchaseDate: '2024-01-15',
      notes: 'Muster-Münze mit Google Drive Bildlink',
      mintMark: 'B',
      material: 'Silber 835',
      weight: '13.2',
      diameter: '31',
      mintage: '300000',
      imageUrl: 'https://drive.google.com/file/d/123456789/view',
      reverseImageUrl: '',
      isFavorite: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'muster-2',
      catalogNumber: 'DE-2024-02',
      storageLocation: 'Ordner B',
      name: '2 Euro Bundesländer',
      country: 'Deutschland',
      faceValue: '2',
      currency: 'EUR',
      year: 2024,
      condition: 'vz',
      purchasePrice: 2.00,
      currentValue: 4.50,
      purchaseDate: '2024-02-10',
      notes: 'Zweites Muster',
      mintMark: 'A',
      material: 'Cu-Ni',
      weight: '8.5',
      diameter: '25.75',
      mintage: '1000000',
      imageUrl: '',
      reverseImageUrl: '',
      isFavorite: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];

  const csvData = exportCoinsToCSV(sampleCoins);
  downloadCSVFile(csvData, 'muenzsammlung_vorlage.csv');
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

export function parseImageSideAndBaseName(rawName: string): {
  baseKey: string;
  isReverse: boolean;
  isFront: boolean;
} {
  if (!rawName) return { baseKey: '', isReverse: false, isFront: false };
  
  // 1. Convert to string and trim
  let clean = String(rawName).trim();

  // 2. Remove file extensions (e.g. .jpg, .jpeg, .png, .webp, .heic, .gif, .svg)
  clean = clean.replace(/\.(jpg|jpeg|png|webp|gif|svg|heic)+$/gi, '').trim();

  // 3. Strip trailing copy/duplicate markers like (1), (2), [1], [2], - Copy
  clean = clean.replace(/[\s_-]*(\(\d+\)|\[\d+\]|copy)$/gi, '').trim();

  // 4. Check for Reverse indicator: _h, -h, .h, _r, -r, .r, _b, -b, .b, _2, -2, .2, back, revers, rueckseite, rückseite, hinten
  const isReverse = 
    /([_\.\-\s](h|r|b|2|back|revers|rueckseite|rückseite|hinten))$/i.test(clean) ||
    /\b(revers|rueckseite|rückseite|back|hinten)\b/i.test(clean);

  // 5. Check for Front indicator: _f, -f, .f, _a, -a, .a, _v, -v, .v, _1, -1, .1, front, avers, vorderseite
  const isFront = !isReverse && (
    /([_\.\-\s](f|v|a|1|front|vorderseite|avers))$/i.test(clean) ||
    /\b(vorderseite|avers|front)\b/i.test(clean)
  );

  // 6. Strip ONLY the trailing side indicator at the end of the string
  let baseKey = clean
    .replace(/[_\.\-\s]+(f|v|a|h|r|b|front|vorderseite|back|rueckseite|rückseite|hinten|avers|revers|1|2)$/i, '')
    .replace(/\b(avers|vorderseite|front|revers|rueckseite|rückseite|back|hinten)\b/gi, '')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

  return {
    baseKey: baseKey || clean.toLowerCase(),
    isReverse,
    isFront
  };
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
  const headers = parseCsvLine(headerLine, delimiter).map(h => h.trim().toLowerCase());

  // Check if header contains named columns
  const findHeaderIndex = (...keywords: string[]): number => {
    return headers.findIndex(h => keywords.some(kw => h === kw.toLowerCase() || h.includes(kw.toLowerCase())));
  };

  const nameIdx = findHeaderIndex('name', 'title', 'file name', 'dateiname', 'bezeichnung');
  const imageIdx = findHeaderIndex('imageurl', 'webcontentlink', 'webviewlink', 'web view link', 'web content link', 'view link', 'content link', 'link', 'bild', 'url', 'drive link', 'image');
  const reverseImageIdx = findHeaderIndex('reverseimageurl', 'rueckseite', 'rückseite', 'back image');
  const catalogIdx = findHeaderIndex('catalognumber', 'katalognummer', 'katalognr');
  const locationIdx = findHeaderIndex('storagelocation', 'lagerort', 'ordner', 'pfad');
  const countryIdx = findHeaderIndex('country', 'land');
  const valueIdx = findHeaderIndex('facevalue', 'nennwert');
  const currIdx = findHeaderIndex('currency', 'waehrung', 'währung');
  const yearIdx = findHeaderIndex('year', 'jahr');
  const condIdx = findHeaderIndex('condition', 'erhaltung', 'zustand');
  const pPriceIdx = findHeaderIndex('purchaseprice', 'kaufpreis', 'preis');
  const cValueIdx = findHeaderIndex('currentvalue', 'aktuellerwert', 'wert', 'schätzwert');
  const pDateIdx = findHeaderIndex('purchasedate', 'kaufdatum', 'datum');
  const notesIdx = findHeaderIndex('notes', 'notizen', 'beschreibung');
  const mintIdx = findHeaderIndex('mintmark', 'prägestätte', 'praegestaette', 'münzzeichen');
  const matIdx = findHeaderIndex('material');
  const weightIdx = findHeaderIndex('weight', 'gewicht');
  const diamIdx = findHeaderIndex('diameter', 'durchmesser');
  const mintageIdx = findHeaderIndex('mintage', 'auflage');
  const favIdx = findHeaderIndex('isfavorite', 'favorit');
  const idIdx = findHeaderIndex('id');

  const isNamedHeader = nameIdx !== -1 || imageIdx !== -1 || countryIdx !== -1 || locationIdx !== -1;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const cells = parseCsvLine(line, delimiter);

    if (cells.length < 1) continue;

    try {
      let id = '', catalogNumber = '', storageLocation = '', name = '', country = '', faceValue = '1', currency = 'CHF';
      let yearStr = '2000', conditionRaw = 'vz', purchasePriceStr = '0', currentValueStr = '0', purchaseDate = '';
      let notes = '', mintMark = '', material = '', weight = '', diameter = '', mintage = '';
      let imageUrl = '', reverseImageUrl = '', isFavoriteStr = 'false';

      if (isNamedHeader) {
        id = idIdx !== -1 ? cells[idIdx] : '';
        catalogNumber = catalogIdx !== -1 ? cells[catalogIdx] : '';
        storageLocation = locationIdx !== -1 ? cells[locationIdx] : '';
        name = nameIdx !== -1 ? cells[nameIdx] : '';
        country = countryIdx !== -1 ? cells[countryIdx] : '';
        faceValue = valueIdx !== -1 ? cells[valueIdx] : '1';
        currency = currIdx !== -1 ? cells[currIdx] : 'CHF';
        yearStr = yearIdx !== -1 ? cells[yearIdx] : '2000';
        conditionRaw = condIdx !== -1 ? cells[condIdx] : 'vz';
        purchasePriceStr = pPriceIdx !== -1 ? cells[pPriceIdx] : '0';
        currentValueStr = cValueIdx !== -1 ? cells[cValueIdx] : '0';
        purchaseDate = pDateIdx !== -1 ? cells[pDateIdx] : '';
        notes = notesIdx !== -1 ? cells[notesIdx] : '';
        mintMark = mintIdx !== -1 ? cells[mintIdx] : '';
        material = matIdx !== -1 ? cells[matIdx] : '';
        weight = weightIdx !== -1 ? cells[weightIdx] : '';
        diameter = diamIdx !== -1 ? cells[diamIdx] : '';
        mintage = mintageIdx !== -1 ? cells[mintageIdx] : '';
        imageUrl = imageIdx !== -1 ? cells[imageIdx] : '';
        reverseImageUrl = reverseImageIdx !== -1 ? cells[reverseImageIdx] : '';
        isFavoriteStr = favIdx !== -1 ? cells[favIdx] : 'false';
      } else {
        // Fallback for positional columns
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
        } else if (cells.length >= 17) {
          [
            id, name, country, faceValue, currency, yearStr, conditionRaw,
            purchasePriceStr, currentValueStr, purchaseDate, notes, mintMark,
            material, weight, diameter, mintage, imageUrl, isFavoriteStr
          ] = cells;
        } else {
          // Simple CSV with 2-5 columns (e.g. Name; ImageUrl)
          name = cells[0] || 'Unbenannte Münze';
          imageUrl = cells[1] || '';
          if (cells[2]) country = cells[2];
          if (cells[3]) yearStr = cells[3];
        }
      }

      const year = parseInt(yearStr || '2000', 10);
      const purchasePrice = parseFloat((purchasePriceStr || '0').replace(',', '.'));
      const currentValue = parseFloat((currentValueStr || '0').replace(',', '.'));

      const validConditions: CoinCondition[] = ['PP', 'stgl', 'vz', 'ss', 's', 'ge'];
      const condition: CoinCondition = validConditions.includes(conditionRaw as CoinCondition)
        ? (conditionRaw as CoinCondition)
        : 'vz';

      const formattedImageUrl = formatDriveImageUrl(imageUrl);
      const formattedReverseImageUrl = formatDriveImageUrl(reverseImageUrl);

      // Skip lines that are CSV files themselves (e.g. muenzsammlung.csv)
      if ((name && name.toLowerCase().endsWith('.csv')) || (imageUrl && imageUrl.toLowerCase().endsWith('.csv'))) {
        continue;
      }

      // Extract raw clean filename without extension for pairing
      let rawStem = (name || '').trim().replace(/\.(jpg|jpeg|png|webp|heic|csv|gif|svg)$/i, '');
      let cleanName = rawStem;
      if (!cleanName || cleanName === 'Unbenannte Münze' || cleanName.toLowerCase() === 'titel') {
        cleanName = 'TITEL';
      } else {
        cleanName = cleanName.replace(/_/g, ' ').trim() || 'TITEL';
      }

      const userSKU = catalogNumber ? formatSKU(catalogNumber) : '';

      const { baseKey, isReverse } = parseImageSideAndBaseName(rawStem);

      let frontUrl = formattedImageUrl;
      let reverseUrl = formattedReverseImageUrl;

      if (isReverse) {
        if (!reverseUrl && frontUrl) {
          reverseUrl = frontUrl;
          frontUrl = '';
        }
      }

      const coin: Coin = {
        id: id || `csv-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 7)}`,
        catalogNumber: userSKU,
        storageLocation: storageLocation || '',
        rawBaseName: baseKey,
        name: rawStem || cleanName,
        country: country || 'Schweiz',
        faceValue: faceValue || '1',
        currency: currency || 'CHF',
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
        imageUrl: frontUrl,
        reverseImageUrl: reverseUrl,
        isFavorite: isFavoriteStr === 'true' || isFavoriteStr === '1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      coins.push(coin);
    } catch (err) {
      errors.push(`Fehler in Zeile ${i + 1}: ${(err as Error).message}`);
    }
  }

  // Smart Post-Processing: Group coins by baseKey and merge front + reverse
  const groups = new Map<string, Coin[]>();

  for (const coin of coins) {
    const { baseKey } = parseImageSideAndBaseName(coin.rawBaseName || coin.name);
    const key = baseKey || coin.name.toLowerCase();
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(coin);
  }

  const mergedCoins: Coin[] = [];

  groups.forEach((groupCoins) => {
    if (groupCoins.length === 1) {
      const single = groupCoins[0];
      mergedCoins.push({
        ...single,
        name: (single.name && single.name !== 'Unbenannte Münze' && !single.name.toLowerCase().startsWith('münze_')) ? single.name : 'TITEL'
      });
    } else {
      let primaryCoin = groupCoins[0];
      let frontImg = '';
      let reverseImg = '';

      for (const c of groupCoins) {
        const { isReverse } = parseImageSideAndBaseName(c.rawBaseName || c.name);
        
        if (c.imageUrl) {
          if (isReverse && !reverseImg) {
            reverseImg = c.imageUrl;
          } else if (!frontImg) {
            frontImg = c.imageUrl;
          } else if (!reverseImg) {
            reverseImg = c.imageUrl;
          }
        }

        if (c.reverseImageUrl && !reverseImg) {
          reverseImg = c.reverseImageUrl;
        }
      }

      if (frontImg === reverseImg) {
        reverseImg = '';
      }

      mergedCoins.push({
        ...primaryCoin,
        name: 'TITEL',
        imageUrl: frontImg || primaryCoin.imageUrl || '',
        reverseImageUrl: (reverseImg && reverseImg !== frontImg) ? reverseImg : (primaryCoin.reverseImageUrl && primaryCoin.reverseImageUrl !== frontImg ? primaryCoin.reverseImageUrl : '')
      });
    }
  });

  // Ensure catalogNumber (Numisma SKU / Katalognummer) is formatted if provided
  const finalCoins = mergedCoins.map(coin => {
    const catNum = formatSKU(coin.catalogNumber || '');
    return {
      ...coin,
      catalogNumber: catNum,
      name: (coin.name && coin.name !== 'Unbenannte Münze') ? coin.name : 'TITEL'
    };
  });

  return { coins: finalCoins, errors };
}

export function formatDriveImageUrl(url?: string | null): string {
  if (!url) return '';
  const trimmed = url.trim();
  const matchFileD = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (matchFileD && matchFileD[1]) {
    return `https://lh3.googleusercontent.com/d/${matchFileD[1]}`;
  }
  const matchIdParam = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (matchIdParam && matchIdParam[1]) {
    return `https://lh3.googleusercontent.com/d/${matchIdParam[1]}`;
  }
  return trimmed;
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
