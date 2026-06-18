import React, { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { Map, Camera, RasterSource, Layer } from '@maplibre/maplibre-react-native';
import type { CameraRef } from '@maplibre/maplibre-react-native';
import { OSM_TILE_URL } from '@/shared/config/map';
import type { MapRegion, AppMapViewHandle } from './types';

const EMPTY_STYLE = JSON.stringify({ version: 8, sources: {}, layers: [] });

function regionToZoom(region: MapRegion): number {
  return Math.log2(180 / region.latitudeDelta);
}

interface AppMapViewProps {
  style?: StyleProp<ViewStyle>;
  initialRegion: MapRegion;
  onRegionChangeComplete?: (region: MapRegion) => void;
  mapType?: string;
  showsUserLocation?: boolean;
  showsMyLocationButton?: boolean;
  showsCompass?: boolean;
  toolbarEnabled?: boolean;
  children?: React.ReactNode;
}

export const AppMapView = forwardRef<AppMapViewHandle, AppMapViewProps>(
  ({ style, initialRegion, onRegionChangeComplete, children }, ref) => {
    const cameraRef = useRef<CameraRef>(null);
    // Gate annotations behind style load — ViewAnnotation crashes if added before style is ready
    const [styleLoaded, setStyleLoaded] = useState(false);

    useImperativeHandle(ref, () => ({
      animateToRegion: (region, duration = 500) => {
        cameraRef.current?.easeTo({
          center: [region.longitude, region.latitude],
          zoom: regionToZoom(region),
          duration,
        });
      },
    }));

    return (
      <Map
        style={style as any}
        mapStyle={EMPTY_STYLE}
        onDidFinishLoadingStyle={() => setStyleLoaded(true)}
        onRegionDidChange={(e) => {
          if (!onRegionChangeComplete) return;
          const { center, zoom } = e.nativeEvent;
          const latDelta = 180 / Math.pow(2, zoom);
          onRegionChangeComplete({
            latitude: center[1],
            longitude: center[0],
            latitudeDelta: latDelta,
            longitudeDelta: latDelta,
          });
        }}
      >
        <Camera
          ref={cameraRef}
          initialViewState={{
            center: [initialRegion.longitude, initialRegion.latitude],
            zoom: regionToZoom(initialRegion),
          }}
        />
        <RasterSource id="osm-base" tiles={[OSM_TILE_URL]} tileSize={256} maxzoom={19}>
          <Layer id="osm-base-layer" type="raster" />
        </RasterSource>
        {styleLoaded && children}
      </Map>
    );
  }
);
