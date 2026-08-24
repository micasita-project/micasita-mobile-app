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

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

const METERS_PER_DEGREE_LAT = 111320;

/**
 * Cuando varias viviendas comparten exactamente la misma coordenada (geocoding
 * de una dirección sin número de puerta, que cae al centroide de la calle),
 * sus marcadores quedan perfectamente superpuestos en el mapa: seleccionar
 * uno hace que el otro reaparezca encima y quede imposible de tocar.
 *
 * Devuelve una copia de `items` donde cada grupo de coordenadas coincidentes
 * (a menos de ~1 m) se reparte en un pequeño círculo alrededor del punto
 * original, para que cada marcador sea visible y seleccionable por separado.
 * Los puntos sin coincidencia se devuelven sin tocar, en el mismo orden.
 */
export function spreadOverlappingMarkers<T extends GeoPoint>(
  items: T[],
  radiusMeters = 18,
): T[] {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const key = `${item.latitude.toFixed(5)},${item.longitude.toFixed(5)}`;
    const group = groups.get(key);
    if (group) group.push(item);
    else groups.set(key, [item]);
  }

  const offsets = new Map<T, GeoPoint>();
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    const metersPerDegreeLon =
      METERS_PER_DEGREE_LAT * Math.cos((group[0].latitude * Math.PI) / 180);
    group.forEach((item, i) => {
      const angle = (2 * Math.PI * i) / group.length;
      offsets.set(item, {
        latitude: item.latitude + (radiusMeters * Math.sin(angle)) / METERS_PER_DEGREE_LAT,
        longitude: item.longitude + (radiusMeters * Math.cos(angle)) / metersPerDegreeLon,
      });
    });
  }

  return items.map((item) => {
    const offset = offsets.get(item);
    return offset ? { ...item, ...offset } : item;
  });
}
