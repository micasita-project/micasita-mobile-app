/**
 * @layer features/recommendation/model
 * @description Build user-facing explanation messages for recommendations.
 */

import { formatPrice } from "@/shared/utils/currency";
import type { RecommendationItem } from "../api/recommendation.api";

export function scoreLabel(score: number): string {
  if (score >= 85) return "Excelente";
  if (score >= 70) return "Muy bueno";
  if (score >= 55) return "Bueno";
  return "Regular";
}

function buildHighlights(item: RecommendationItem): string {
  const parts: string[] = [];
  if (item.property.bedrooms > 0) parts.push(`${item.property.bedrooms} hab`);
  if (item.property.total_area_sqm > 0)
    parts.push(`${item.property.total_area_sqm} m²`);
  if (item.property.price > 0)
    parts.push(formatPrice(item.property.price, item.property.currency));
  return parts.join(" · ");
}

export function buildRecommendationMessage(item: RecommendationItem): string {
  const saved = item.time_saved_mins;

  if (saved !== null && Number.isFinite(saved)) {
    const rounded = Math.round(saved);
    if (rounded >= 15)
      return `Ahorra ${rounded} min al trabajo cada día vs tu ubicación actual.`;
    if (rounded > 0)
      return `Recortas ${rounded} min de viaje diario vs donde vives ahora.`;
    if (rounded === 0)
      return `Tiempo de viaje similar al de tu ubicación actual.`;
    const highlight = buildHighlights(item) || "buenas características";
    return `${Math.abs(rounded)} min más de viaje, pero ${highlight}.`;
  }

  const minutes = Math.round(item.predicted_time_min);
  if (item.predicted_time_min <= 20)
    return `A solo ${minutes} min de tu trabajo — excelente ubicación.`;
  if (item.predicted_time_min <= 40)
    return `Trayecto cómodo de ${minutes} min al trabajo.`;

  const highlight = buildHighlights(item) || "buenas características";
  return `${highlight} — ideal si el espacio es prioridad.`;
}

// ── Insight screen messages ──────────────────────────────────────

export function buildInsightTitle(item: RecommendationItem): string {
  if (item.match_score >= 85) return "Excelente opción para ti";
  if (item.match_score >= 70) return "Muy buena alternativa";
  if (item.match_score >= 55) return "Una opción a considerar";
  return "Revísala con cuidado";
}

export function buildInsightBody(item: RecommendationItem): string {
  const saved = item.time_saved_mins;
  const score = item.match_score;

  if (saved !== null && Number.isFinite(saved)) {
    const rounded = Math.round(saved);
    if (rounded >= 20)
      return `Reducirías tu viaje diario en ${rounded} minutos respecto a tu hogar actual. Una diferencia notable en calidad de vida.`;
    if (rounded >= 5)
      return `Ahorrarías ${rounded} minutos al trabajo cada día frente a tu ubicación actual.`;
    if (rounded > 0)
      return `Tiempo de viaje prácticamente igual al tuyo, con una ligera mejora de ${rounded} min.`;
    if (rounded === 0)
      return `El tiempo al trabajo es casi idéntico al de tu casa actual. La ventaja está en las características de la propiedad.`;
    const abs = Math.abs(rounded);
    if (score >= 70)
      return `Solo ${abs} min adicionales al trabajo. Las características compensan ampliamente la distancia extra.`;
    return `${abs} minutos más de viaje respecto a tu ubicación actual — considera si las características justifican el cambio.`;
  }

  const min = Math.round(item.predicted_time_min);
  if (min <= 15)
    return `A solo ${min} minutos de tu trabajo. Una ubicación privilegiada que puede transformar tu rutina diaria.`;
  if (min <= 30)
    return `Trayecto cómodo de ${min} minutos al trabajo, perfecto para el día a día.`;
  if (min <= 45)
    return `${min} minutos al trabajo, un recorrido manejable con tu modo de transporte habitual.`;
  return `Con ${min} minutos al trabajo, las características de esta vivienda son el punto fuerte a evaluar.`;
}
