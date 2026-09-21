/**
 * @layer app (pages)
 * @description Vista de mapa centrada en una sola vivienda — reemplazo del
 * botón "compartir" en el detalle, que no tenía handler. Pantalla liviana,
 * a propósito no reutiliza el mapa multi-marcador de app/(tabs)/index.tsx
 * (home + trabajo + N candidatas + polyline): acá solo hace falta un pin.
 */

import { Colors } from "@/shared/config/colors";
import { AppMapView, AppMarker, AppUrlTile } from "@/shared/ui/map";
import { OSM_TILE_URL } from "@/shared/config/map";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import { Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function PropertyMapScreen() {
  const { lat, lon, title } = useLocalSearchParams<{
    lat: string;
    lon: string;
    title?: string;
  }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const topOffset = Platform.OS === "android" ? insets.top : 0;

  const latitude = Number(lat);
  const longitude = Number(lon);
  const region = { latitude, longitude, latitudeDelta: 0.008, longitudeDelta: 0.008 };

  return (
    <View style={styles.container}>
      <AppMapView
        style={styles.map}
        initialRegion={region}
        mapType="none"
        showsUserLocation={false}
        showsMyLocationButton={false}
        showsCompass={false}
        toolbarEnabled={false}
      >
        <AppUrlTile urlTemplate={OSM_TILE_URL} maximumZ={19} tileSize={256} />
        <AppMarker coordinate={{ latitude, longitude }} title={title ?? "Vivienda"}>
          <View style={styles.pin}>
            <Ionicons name="home" size={20} color={Colors.textOnPrimary} />
          </View>
        </AppMarker>
      </AppMapView>

      <TouchableOpacity
        style={[styles.backButton, { top: 16 + topOffset }]}
        onPress={() => router.back()}
        activeOpacity={0.8}
      >
        <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
      </TouchableOpacity>

      {title ? (
        <View style={[styles.titleBar, { top: 16 + topOffset }]}>
          <Text style={styles.titleText} numberOfLines={1}>
            {title}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  map: { flex: 1 },
  pin: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  backButton: {
    position: "absolute",
    left: 16,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.92)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  titleBar: {
    position: "absolute",
    left: 64,
    right: 16,
    height: 38,
    justifyContent: "center",
    paddingHorizontal: 14,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.92)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  titleText: { fontSize: 13, fontWeight: "600", color: Colors.textPrimary },
});
