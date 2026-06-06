const LIMA_LAT_MIN = -12.55;
const LIMA_LAT_MAX = -11.70;
const LIMA_LON_MIN = -77.20;
const LIMA_LON_MAX = -76.65;

export const LIMA_LOCATION_ERROR =
  'Solo aceptamos ubicaciones dentro de Lima Metropolitana. ' +
  'El punto seleccionado está fuera de nuestra zona de cobertura.';

export function isWithinLima(lat: number, lon: number): boolean {
  return (
    lat >= LIMA_LAT_MIN && lat <= LIMA_LAT_MAX &&
    lon >= LIMA_LON_MIN && lon <= LIMA_LON_MAX
  );
}
