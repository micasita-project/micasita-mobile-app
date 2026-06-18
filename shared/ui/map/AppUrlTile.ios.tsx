import React from 'react';
import { UrlTile } from 'react-native-maps';

interface AppUrlTileProps {
  urlTemplate: string;
  maximumZ?: number;
  tileSize?: number;
}

export function AppUrlTile({ urlTemplate, maximumZ, tileSize }: AppUrlTileProps) {
  return <UrlTile urlTemplate={urlTemplate} maximumZ={maximumZ} tileSize={tileSize} />;
}
