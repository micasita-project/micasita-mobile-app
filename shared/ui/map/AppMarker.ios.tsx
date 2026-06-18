import React from 'react';
import { Marker } from 'react-native-maps';

interface AppMarkerProps {
  coordinate: { latitude: number; longitude: number };
  onPress?: () => void;
  title?: string;
  tracksViewChanges?: boolean;
  children?: React.ReactNode;
}

export function AppMarker({ coordinate, onPress, title, tracksViewChanges, children }: AppMarkerProps) {
  return (
    <Marker
      coordinate={coordinate}
      onPress={onPress}
      title={title}
      tracksViewChanges={tracksViewChanges}
    >
      {children as any}
    </Marker>
  );
}
