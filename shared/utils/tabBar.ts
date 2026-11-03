/**
 * @layer shared/utils
 * @description Medidas de la barra de pestañas según el área segura inferior.
 */

const CONTENT_HEIGHT = 56;
const MIN_BOTTOM_PADDING = 12;

export function getTabBarMetrics(bottomInset: number) {
  const paddingBottom = Math.max(bottomInset, MIN_BOTTOM_PADDING);
  return { height: CONTENT_HEIGHT + paddingBottom, paddingBottom };
}
