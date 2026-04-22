/**
 * Transform raw scraper JSON → entities/housing/api/housing.data.json
 *
 * Fixes applied:
 * 1. Wrong coordinates (lat -18.x → -12.x, lon -70.x → -77.x) – scraper bug
 * 2. null prices / currency → sensible defaults based on sqm/district
 * 3. null bedrooms → 0 (office-type listings)
 * 4. Image paths → "housing-images/{id}/foto_NN.ext" (relative to assets/)
 * 5. Adds features[] extracted from description keywords
 * 6. Ensures every record has all required Housing fields
 *
 * Run: node scripts/transform-housing.js
 */

const fs   = require('fs');
const path = require('path');

// ─── Source data (paste from scraper or point to a file) ─────────────────────
const RAW = JSON.parse(fs.readFileSync(
  path.join(__dirname, 'housing-raw.json'), 'utf8'
));

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Lima is at lat≈-12, lon≈-77.  The scraper confused -18/-70 with -12/-77. */
function fixCoords(lat, lon) {
  let la = lat, lo = lon;
  if (la < -14) la = parseFloat(la.toFixed(6).replace('-18.', '-12.').replace('-17.', '-12.').replace('-16.', '-12.').replace('-15.', '-12.'));
  if (lo > -73) lo = parseFloat(lo.toFixed(6).replace('-70.', '-77.').replace('-71.', '-77.').replace('-72.', '-77.'));
  return { latitude: la, longitude: lo };
}

const AMENITY_KEYWORDS = [
  ['Piscina',      /piscina/i],
  ['Gimnasio',     /gimnasio|gym/i],
  ['Parrilla',     /parrilla|bbq|barbacoa/i],
  ['Estacionamiento', /cochera|estacionamiento|parking/i],
  ['Amoblado',     /amoblado|amueblado/i],
  ['Seguridad 24\/7', /vigilancia|seguridad|guardia/i],
  ['Coworking',    /coworking/i],
  ['Ascensor',     /ascensor/i],
  ['Balcón',       /balcón|balcon/i],
  ['Áreas comunes',/áreas comunes|areas comunes/i],
  ['Pet Friendly', /mascota|pet.friendly/i],
  ['Gas natural',  /gas natural|calidda/i],
  ['Terraza',      /terraza/i],
  ['Vista al mar', /vista al mar/i],
];

function extractFeatures(desc = '') {
  const found = [];
  for (const [label, re] of AMENITY_KEYWORDS) {
    if (re.test(desc) && found.length < 5) found.push(label);
  }
  return found.length ? found : ['Edificio moderno'];
}

/** Estimate a PEN price from sqm + district when price is null */
function estimatePrice(sqm, district = '', currency) {
  const base = district.toLowerCase().includes('miraflores') ||
               district.toLowerCase().includes('san isidro') ? 35
             : district.toLowerCase().includes('barranco') ||
               district.toLowerCase().includes('surco')    ? 22
             : 15; // soles per sqm per month
  const pen = Math.round((sqm || 60) * base / 100) * 100;
  return pen;
}

/** Resolve local image paths relative to assets/ */
function resolveImages(rawImages = [], id) {
  return rawImages.map(p => {
    // Already an http URL → keep
    if (typeof p === 'string' && p.startsWith('http')) return p;
    // Local Windows path → extract filename and rebuild
    const filename = path.basename(p);
    return `housing-images/${id}/${filename}`;
  });
}

// ─── Transform ────────────────────────────────────────────────────────────────
const OUT = RAW.map(item => {
  const { latitude: la, longitude: lo } = fixCoords(
    item.latitude  ?? -12.0464,
    item.longitude ?? -77.0428
  );

  const currency = item.currency ?? 'PEN';
  const price    = item.price ?? estimatePrice(item.total_area_sqm, item.district, currency);
  const bedrooms = item.bedrooms ?? 0;

  return {
    id:              String(item.id),
    title:           item.title         ?? '',
    property_type:   item.property_type ?? 'Departamento',
    address:         item.address       ?? '',
    district:        item.district      ?? 'Lima',
    latitude:        la,
    longitude:       lo,
    currency,
    price,
    total_area_sqm:  item.total_area_sqm  ?? 0,
    covered_area_sqm:item.covered_area_sqm ?? null,
    bedrooms,
    bathrooms:       item.bathrooms ?? 1,
    parking:         item.parking   ?? 0,
    antiquity:       item.antiquity  ?? 0,
    description:     item.description ?? '',
    images:          resolveImages(item.images, item.id),
    features:        extractFeatures(item.description),
    source_url:      item.source_url ?? '',
  };
});

const DEST = path.join(__dirname, '../entities/housing/api/housing.data.json');
fs.writeFileSync(DEST, JSON.stringify(OUT, null, 2), 'utf8');
console.log(`✅  Written ${OUT.length} records → ${DEST}`);
