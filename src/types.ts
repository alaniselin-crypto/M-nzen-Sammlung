export type CoinCondition = 
  | 'PP' // Polierte Platte (Proof)
  | 'stgl' // Stempelglanz (Uncirculated)
  | 'vz' // Vorzüglich (Extremely Fine)
  | 'ss' // Sehr schön (Very Fine)
  | 's' // Schön (Fine)
  | 'ge'; // Gering erhalten (Fair/Good)

export type RarityLevel = 
  | 'A - Häufig'
  | 'B - Nicht häufig'
  | 'C - Knapp'
  | 'R - Selten'
  | 'RR - Sehr Selten'
  | 'RRR - Äusserst selten';

export interface Coin {
  id: string;
  catalogNumber?: string; // Automatische 4/5-stellige Nummer (z.B. "00001", "00104")
  itemType?: 'coin' | 'banknote'; // Münze oder Banknote
  quantity?: number; // Anzahl Stücke (Standard 1)
  rarity?: RarityLevel | string; // Seltenheitsgrad (A, B, C, R, RR, RRR)
  storageLocation?: string; // Lagerort / Ordner (z.B. "Ordner 1", "Ordner 2", "Münzkassette A")
  name: string;
  country: string;
  faceValue: string;
  currency: string;
  year: number;
  condition: CoinCondition;
  purchasePrice: number;
  currentValue: number;
  purchaseDate: string;
  notes: string;
  mintMark?: string; // z.B. "A", "D", "F", "G", "J"
  material?: string; // z.B. "Gold (999/1000)", "Silber (900/1000)", "Bimetall", "Kupfer-Nickel"
  weight?: string; // z.B. "31.1g (1 oz)"
  diameter?: string; // z.B. "32.7 mm"
  mintage?: string; // Auflagezahl
  imageUrl?: string; // Vorderseite (Avers)
  reverseImageUrl?: string; // Rückseite (Revers)
  isFavorite?: boolean;
  
  // Verkauf & Plattformen (Sales Tracking)
  isForSale?: boolean; // Z.B. Ja = Auf Plattform eingestellt
  listingPlatform?: string; // z.B. "Ricardo.ch", "eBay", "Tutti.ch", "Anibis", "Auktionshaus"
  listingPrice?: number; // Angebotspreis / Einstellpreis
  listingUrl?: string; // Link zum Angebot auf Ricardo/eBay
  isSold?: boolean; // Bereits verkauft
  soldPrice?: number; // Tatsächlicher Verkaufspreis
  soldDate?: string; // Verkaufsdatum

  createdAt: string;
  updatedAt: string;
}

export interface CoinFilterState {
  searchQuery: string;
  itemType: string; // '', 'coin', 'banknote'
  rarity: string;
  country: string;
  condition: string;
  material: string;
  storageLocation: string;
  listingPlatform: string;
  onlyForSale: boolean;
  onlySold: boolean;
  yearFrom: string;
  yearTo: string;
  sortBy: 'currentValue-desc' | 'currentValue-asc' | 'year-desc' | 'year-asc' | 'name-asc' | 'purchaseDate-desc' | 'catalogNumber-asc' | 'catalogNumber-desc';
  onlyFavorites: boolean;
}

export type TabType = 'dashboard' | 'collection' | 'add' | 'statistics' | 'backup';

