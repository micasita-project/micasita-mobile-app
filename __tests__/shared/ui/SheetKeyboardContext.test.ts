import { focusedInputScrollOffset } from '@/shared/ui/SheetKeyboardContext';

const bounds = {
  offset: 100, viewportTop: 100, viewportBottom: 700,
  keyboardTop: 600, footerHeight: 80, inputTop: 400, inputHeight: 50,
};

it('deja quieto un campo que ya está visible', () => {
  expect(focusedInputScrollOffset(bounds)).toBe(100);
});

it('saca el campo de debajo de los botones fijos, además del teclado', () => {
  const current = { ...bounds, inputTop: 540 };
  const offset = focusedInputScrollOffset(current);
  const fieldBottomAfterScroll = current.inputTop + current.inputHeight - (offset - current.offset);
  expect(fieldBottomAfterScroll).toBeLessThanOrEqual(current.keyboardTop - current.footerHeight - 12);
});

it('respeta un panel más bajo que el borde superior del teclado', () => {
  const current = { ...bounds, viewportBottom: 500, inputTop: 450 };
  const offset = focusedInputScrollOffset(current);
  expect(current.inputTop + current.inputHeight - (offset - current.offset))
    .toBeLessThanOrEqual(current.viewportBottom - current.footerHeight - 12);
});

it('vuelve hacia arriba al cambiar de precio máximo a distrito', () => {
  const current = { ...bounds, inputTop: 20, offset: 300 };
  const offset = focusedInputScrollOffset(current);
  expect(current.inputTop - (offset - current.offset)).toBe(112);
});

it('no genera desplazamientos negativos al estar al inicio', () => {
  expect(focusedInputScrollOffset({ ...bounds, offset: 0, inputTop: 90 })).toBe(0);
});

it('alinea arriba un campo demasiado alto para el espacio disponible', () => {
  const current = { ...bounds, inputTop: 200, inputHeight: 500 };
  const offset = focusedInputScrollOffset(current);
  expect(current.inputTop - (offset - current.offset)).toBe(112);
});
