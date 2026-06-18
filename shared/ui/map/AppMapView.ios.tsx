import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import MapView from 'react-native-maps';
import type { StyleProp, ViewStyle } from 'react-native';
import type { MapRegion, AppMapViewHandle } from './types';

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
  ({ style, initialRegion, onRegionChangeComplete, mapType, showsUserLocation, showsMyLocationButton, showsCompass, toolbarEnabled, children }, ref) => {
    const mapRef = useRef<MapView>(null);

    useImperativeHandle(ref, () => ({
      animateToRegion: (region, duration = 500) => {
        mapRef.current?.animateToRegion(region, duration);
      },
    }));

    return (
      <MapView
        ref={mapRef}
        style={style}
        initialRegion={initialRegion}
        onRegionChangeComplete={onRegionChangeComplete}
        mapType={mapType as any}
        showsUserLocation={showsUserLocation}
        showsMyLocationButton={showsMyLocationButton}
        showsCompass={showsCompass}
        toolbarEnabled={toolbarEnabled}
      >
        {children}
      </MapView>
    );
  }
);
