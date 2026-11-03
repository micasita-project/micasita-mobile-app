import { getImageSource } from '@/shared/utils/image';

describe('getImageSource', () => {
  it('envuelve la ruta en un objeto { uri }', () => {
    expect(getImageSource('https://cdn/a.jpg')).toEqual({ uri: 'https://cdn/a.jpg' });
  });

  it('acepta rutas locales', () => {
    expect(getImageSource('file:///tmp/a.jpg')).toEqual({ uri: 'file:///tmp/a.jpg' });
  });

  it('no altera la ruta recibida', () => {
    expect(getImageSource(' a b.jpg ')).toEqual({ uri: ' a b.jpg ' });
  });

  it.each([undefined, ''])('devuelve undefined para %p', (value) => {
    expect(getImageSource(value)).toBeUndefined();
  });
});
