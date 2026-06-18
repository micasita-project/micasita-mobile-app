import React, { useRef } from 'react';
import { View } from 'react-native';
import { Marker } from '@maplibre/maplibre-react-native';

let _idCounter = 0;

const DEFAULT_PIN = (
  <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: '#e74c3c', borderWidth: 2, borderColor: '#fff' }} />
);

interface AppMarkerProps {
  coordinate: { latitude: number; longitude: number };
  onPress?: () => void;
  title?: string;
  tracksViewChanges?: boolean;
  children?: React.ReactNode;
}

export function AppMarker({ coordinate, onPress, children }: AppMarkerProps) {
  const idRef = useRef(`marker-${++_idCounter}`);

  if (!coordinate?.latitude || !coordinate?.longitude) return null;

  return (
    <Marker
      id={idRef.current}
      lngLat={[coordinate.longitude, coordinate.latitude]}
      anchor="bottom"
      onPress={onPress ? () => onPress() : undefined}
    >
      {(children ?? DEFAULT_PIN) as React.ReactElement}
    </Marker>
  );
}
