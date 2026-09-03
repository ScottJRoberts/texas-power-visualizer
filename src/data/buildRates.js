// ---------------------------------------------------------------------------
// how fast Texas actually builds — annual capacity additions in ERCOT, GW
//
// PROVENANCE: supplied alongside the MORA figures, as ERCOT capacity additions
// by year. Unlike generationProfiles.js this table arrived without a workbook
// tab reference, so it is marked here rather than presented as MORA-sourced.
//
// 2026 is the current reporting year, so its figures include planned additions
// that have not all landed yet. Treat it as the optimistic end of the range,
// which is exactly how it is used below: we always compare against the FASTEST
// year on record, so any conclusion drawn is the conservative one.
// ---------------------------------------------------------------------------

export const ANNUAL_ADDITIONS_GW = [
  { year: 2023, total: 6.9, solar: 2.7, battery: 1.6, wind: 1.3, gas: 1.3 },
  { year: 2024, total: 11.8, solar: 5.2, battery: 4.0, wind: 2.1, gas: 0.6 },
  { year: 2025, total: 18.8, solar: 8.4, battery: 7.0, wind: 2.6, gas: 0.2 },
  { year: 2026, total: 24.7, solar: 13.9, battery: 6.0, wind: 3.5, gas: 1.3 },
];

// The formula uses the total column only. Per-type rates are in the table for
// reference, but a single "years of record-pace building" figure is the honest
// comparison: the user builds a mix, and a mix is what an annual total is.
export const BEST_TOTAL_YEAR = ANNUAL_ADDITIONS_GW.reduce((best, row) =>
  row.total > best.total ? row : best,
);

export const yearsAtRecordPace = (gw) => gw / BEST_TOTAL_YEAR.total;
