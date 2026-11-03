import { getTabBarMetrics } from '@/shared/utils/tabBar';

describe('getTabBarMetrics', () => {
  it('suma el área segura inferior a la altura de la barra', () => {
    expect(getTabBarMetrics(48)).toEqual({ height: 104, paddingBottom: 48 });
  });

  it('respeta el área segura de iOS', () => {
    expect(getTabBarMetrics(34)).toEqual({ height: 90, paddingBottom: 34 });
  });

  it('deja un mínimo de relleno cuando no hay área segura', () => {
    expect(getTabBarMetrics(0)).toEqual({ height: 68, paddingBottom: 12 });
  });

  it('la altura crece con el área segura', () => {
    expect(getTabBarMetrics(60).height).toBeGreaterThan(getTabBarMetrics(30).height);
  });
});
