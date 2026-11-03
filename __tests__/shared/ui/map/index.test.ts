jest.mock('@maplibre/maplibre-react-native', () => require('@/__tests__/_helpers/ui/mockMaps').maplibreModule);
jest.mock('react-native-maps', () => require('@/__tests__/_helpers/ui/mockMaps').nativeMapsModule);

import * as map from '@/shared/ui/map';

describe('shared/ui/map index', () => {
  it('exporta los cinco componentes de mapa', () => {
    expect(Object.keys(map).sort()).toEqual(
      ['AppCircle', 'AppMapView', 'AppMarker', 'AppPolyline', 'AppUrlTile'].sort(),
    );
  });

  it('cada exportación es un componente utilizable', () => {
    expect(typeof map.AppCircle).toBe('function');
    expect(typeof map.AppMarker).toBe('function');
    expect(typeof map.AppPolyline).toBe('function');
    expect(typeof map.AppUrlTile).toBe('function');
    expect(map.AppMapView).toBeTruthy();
  });

  it('en iOS (plataforma por defecto de las pruebas) resuelve las variantes .ios', () => {
    expect(map.AppCircle).toBe(require('@/shared/ui/map/AppCircle.ios').AppCircle);
    expect(map.AppMarker).toBe(require('@/shared/ui/map/AppMarker.ios').AppMarker);
    expect(map.AppPolyline).toBe(require('@/shared/ui/map/AppPolyline.ios').AppPolyline);
    expect(map.AppUrlTile).toBe(require('@/shared/ui/map/AppUrlTile.ios').AppUrlTile);
    expect(map.AppMapView).toBe(require('@/shared/ui/map/AppMapView.ios').AppMapView);
  });
});
