import { Colors } from '@/shared/config/colors';

describe('Colors', () => {
  it('define los colores de marca', () => {
    expect(Colors.primary).toBe('#34216b');
    expect(Colors.background).toBe('#ebe7f3');
    expect(Colors.surface).toBe('#FFFFFF');
    expect(Colors.textOnPrimary).toBe('#FFFFFF');
  });

  it('todos los valores son colores hex o rgba válidos', () => {
    const hex = /^#[0-9a-fA-F]{6}$/;
    const rgba = /^rgba\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*(0|1|0?\.\d+)\s*\)$/;
    for (const [key, value] of Object.entries(Colors)) {
      expect({ key, ok: hex.test(value) || rgba.test(value) }).toEqual({ key, ok: true });
    }
  });

  it('los marcadores de vivienda y de trabajo son distintos', () => {
    expect(Colors.markerHousing).not.toBe(Colors.markerWork);
  });

  it('la ruta alternativa se distingue de la principal', () => {
    expect(Colors.routePolyline).not.toBe(Colors.routePolylineAlternative);
  });
});
