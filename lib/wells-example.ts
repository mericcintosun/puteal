// The example wells file, as a string so the browser can load it without a CSV loader.
// It must stay byte-identical to fixtures/wells-example.csv; npm run proof compares them.
//
// Positions: the 12 sample wells of lib/data/seed.ts turned back into lat/lon with the
// inverse of toMeters in lib/engine.ts, around the origin 23.7815 N, 90.6395 E:
//   lat = 23.7815 + y / 111320
//   lon = 90.6395 + x / (111320 * cos(23.7815 deg))
// Arsenic values are example values (the Haque bari pump reads 9 here instead of the
// sample 22), not survey data. The last row has a typo on purpose (2500 µg/L) so the
// import shows how a rejected row looks.

export const WELLS_EXAMPLE_NAME = "wells-example.csv";

export const WELLS_EXAMPLE_CSV = `name,lat,lon,arsenic_ugl,capacity
Mondal bari pump,23.787698,90.642739,8,100
Bazar mosque pump,23.787114,90.645783,35,80
Primary school deep well,23.786665,90.646568,4,200
Mia bari pump,23.791112,90.645488,42,90
Khan bari pump,23.789405,90.651673,18,100
Sheikh bari pump,23.784599,90.642101,6,90
Char para pump,23.783297,90.652163,120,100
Pond-side pump,23.786980,90.648335,95,100
Haque bari pump,23.787025,90.653734,9,100
Union office pump,23.787070,90.643917,150,100
Brickfield road pump,23.784375,90.650298,64,100
Madrasa deep well,23.789585,90.645635,3,200
Old mill pump,23.785100,90.647200,2500,100
`;
