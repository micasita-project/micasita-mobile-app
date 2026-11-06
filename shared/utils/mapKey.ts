/**
 * @layer shared/utils
 * @description Clave del mapa: cambia cuando cambian el trabajo o las viviendas mostradas.
 */

export function buildMapKey(scope: string, ids: Array<string | number>): string {
  return `${scope}|${ids.join(',')}`;
}
