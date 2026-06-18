export interface MapRegion {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

export interface AppMapViewHandle {
  animateToRegion: (region: MapRegion, duration?: number) => void;
}
