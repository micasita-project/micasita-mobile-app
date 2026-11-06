import { buildMapKey } from '@/shared/utils/mapKey';

describe('buildMapKey', () => {
  it('es la misma para el mismo trabajo y las mismas viviendas', () => {
    expect(buildMapKey('7', ['a', 'b'])).toBe(buildMapKey('7', ['a', 'b']));
  });

  it('cambia al cambiar de trabajo', () => {
    expect(buildMapKey('7', ['a'])).not.toBe(buildMapKey('8', ['a']));
  });

  it('cambia al cambiar las viviendas mostradas', () => {
    expect(buildMapKey('7', ['a', 'b'])).not.toBe(buildMapKey('7', ['a', 'c']));
    expect(buildMapKey('7', ['a'])).not.toBe(buildMapKey('7', []));
  });

  it('distingue invitado de un trabajo', () => {
    expect(buildMapKey('guest', [1])).not.toBe(buildMapKey('1', [1]));
  });
});
