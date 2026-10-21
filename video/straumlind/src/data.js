// Every number on screen comes from here. Prices: general household price per kWh including VAT,
// checked on the sellers' own price lists and aurbjorg.is (14 and 20 October 2026). See STORYBOARD.md.
export const DATA = {
  sl: 10.54, // Straumlind, fixed price for homes
  night: 7.03, // Straumlind night price, 23:00-07:00
  others: [
    // the three largest sellers (about 65% of the market), largest first
    ['Orkusalan', 12.97],
    ['HS Orka', 12.18],
    ['Orka náttúrunnar', 11.41],
  ],
  usage: 4500, // kWh a year, a typical apartment
  source: 'Almennt verð til heimila með vsk. hjá þremur stærstu raforkusölunum og Straumlind, skv. verðskrám þeirra og aurbjorg.is, október 2026. Flutningur og dreifing eru ekki meðtalin.',
};

export const AVG3 = DATA.others.reduce((s, o) => s + o[1], 0) / DATA.others.length; // 12.19
export const PCT_AVG = Math.round((1 - DATA.sl / AVG3) * 100); // 14
export const PCT_MAX = Math.round((1 - DATA.sl / DATA.others[0][1]) * 100); // 19
// exact krónur, so the two yearly costs and the saving on screen always add up
export const YEAR_MAX = Math.round(DATA.others[0][1] * DATA.usage); // 58.365
export const YEAR_SL = Math.round(DATA.sl * DATA.usage); // 47.430
export const SAVE_YEAR = YEAR_MAX - YEAR_SL; // 10.935
export const fmtK = (n) => n.toFixed(2).replace('.', ',');
export const isk = (n) => Math.round(n).toLocaleString('de-DE');
