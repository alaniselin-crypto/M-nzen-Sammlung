export interface CurrencyOption {
  code: string;
  name: string;
  symbol?: string;
}

export const POPULAR_CURRENCIES = [
  { code: 'CHF', name: 'Schweizer Franken (CHF)' },
  { code: 'EUR', name: 'Euro (EUR)' },
  { code: 'USD', name: 'US-Dollar (USD)' },
  { code: 'ARS', name: 'Argentinischer Peso (ARS / Peso)' },
  { code: 'GBP', name: 'Britisches Pfund (GBP)' },
  { code: 'CAD', name: 'Kanadischer Dollar (CAD)' },
  { code: 'AUD', name: 'Australischer Dollar (AUD)' },
  { code: 'JPY', name: 'Japanischer Yen (JPY)' },
  { code: 'CNY', name: 'Chinesischer Yuan (CNY)' },
  { code: 'BRL', name: 'Brasilianischer Real (BRL)' },
  { code: 'MXN', name: 'Mexikanischer Peso (MXN)' },
  { code: 'CLP', name: 'Chilenischer Peso (CLP)' },
  { code: 'COP', name: 'Kolumbianischer Peso (COP)' },
  { code: 'PEN', name: 'Peruanischer Sol (PEN)' },
  { code: 'UYU', name: 'Uruguayischer Peso (UYU)' },
  { code: 'ZAR', name: 'Südafrikanischer Rand (ZAR)' },
  { code: 'INR', name: 'Indische Rupie (INR)' },
  { code: 'RUB', name: 'Russischer Rubel (RUB)' },
  { code: 'TRY', name: 'Türkische Lira (TRY)' },
  { code: 'SEK', name: 'Schwedische Krone (SEK)' },
  { code: 'NOK', name: 'Norwegische Krone (NOK)' },
  { code: 'DKK', name: 'Dänische Krone (DKK)' },
  { code: 'PLN', name: 'Polnischer Zloty (PLN)' },
  { code: 'CZK', name: 'Tschechische Krone (CZK)' },
  { code: 'HUF', name: 'Ungarischer Forint (HUF)' },
  
  // Historical & Numismatic Currencies
  { code: 'Reichsmark', name: 'Reichsmark (RM)' },
  { code: 'Goldmark', name: 'Goldmark' },
  { code: 'Taler / Thaler', name: 'Taler / Thaler' },
  { code: 'Kreuzer', name: 'Kreuzer' },
  { code: 'Gulden', name: 'Gulden' },
  { code: 'Dukat', name: 'Dukat' },
  { code: 'Denar', name: 'Denar (Römisches Reich)' },
  { code: 'Sesterz', name: 'Sesterz (Römisches Reich)' },
  { code: 'Antoninian', name: 'Antoninian (Römisches Reich)' },
  { code: 'Solidus', name: 'Solidus (Byzanz/Rom)' },
  { code: 'Peseta', name: 'Spanische Peseta' },
  { code: 'Lira', name: 'Italienische Lira' },
  { code: 'Drachme', name: 'Griechische Drachme' },
  { code: 'Escudo', name: 'Portugiesischer Escudo' },
  { code: 'Unze Gold', name: 'Goldunze / Anlagemünze' },
  { code: 'Unze Silber', name: 'Silberunze / Anlagemünze' }
];
