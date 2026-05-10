import type { TransportMode } from "@/shared/types";
import { TRANSPORT_MODE_COLORS } from "@/shared/types";

export interface TransportModeConfig {
  id: TransportMode;
  label: string;
  labelFull: string;
  icon: "car" | "bicycle" | "walk";
  iconOutline: "car-outline" | "bicycle-outline" | "walk-outline";
  color: string;
}

export const TRANSPORT_MODE_CONFIG: TransportModeConfig[] = [
  {
    id: "driving",
    label: "Auto",
    labelFull: "Auto",
    icon: "car",
    iconOutline: "car-outline",
    color: TRANSPORT_MODE_COLORS.driving,
  },
  {
    id: "cycling",
    label: "Bici",
    labelFull: "Bicicleta",
    icon: "bicycle",
    iconOutline: "bicycle-outline",
    color: TRANSPORT_MODE_COLORS.cycling,
  },
  {
    id: "walking",
    label: "A pie",
    labelFull: "Caminando",
    icon: "walk",
    iconOutline: "walk-outline",
    color: TRANSPORT_MODE_COLORS.walking,
  },
];

export function getTransportConfig(mode: TransportMode): TransportModeConfig {
  return TRANSPORT_MODE_CONFIG.find((c) => c.id === mode)!;
}
