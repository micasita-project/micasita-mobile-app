import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { SheetTextInput } from '@/shared/ui/SheetTextInput';
import { sheet, resetSheet } from '@/__tests__/_helpers/ui/mockGorhom';

jest.mock('@gorhom/bottom-sheet', () => require('@/__tests__/_helpers/ui/mockGorhom').gorhomModule);

beforeEach(resetSheet);

describe('SheetTextInput', () => {
  it('fuera de un panel usa el TextInput nativo', async () => {
    const { getByPlaceholderText, queryByTestId } = await render(<SheetTextInput placeholder="Dirección" />);
    expect(getByPlaceholderText('Dirección')).toBeTruthy();
    expect(queryByTestId('sheet-text-input')).toBeNull();
  });

  it('dentro de un panel usa el campo de la librería', async () => {
    sheet.internal = { animatedKeyboardState: {} };
    const { getByTestId } = await render(<SheetTextInput placeholder="Dirección" />);
    expect(getByTestId('sheet-text-input')).toBeTruthy();
  });

  it('consulta el contexto en modo seguro para no fallar fuera de un panel', async () => {
    const { useBottomSheetInternal } = require('@gorhom/bottom-sheet');
    await render(<SheetTextInput />);
    expect(useBottomSheetInternal).toHaveBeenCalledWith(true);
  });

  it('reenvía las props al campo en ambos casos', async () => {
    const onChangeText = jest.fn();
    const fuera = await render(
      <SheetTextInput placeholder="a" value="hola" onChangeText={onChangeText} maxLength={9} />,
    );
    await fireEvent.changeText(fuera.getByPlaceholderText('a'), 'nuevo');
    expect(onChangeText).toHaveBeenCalledWith('nuevo');
    expect(fuera.getByPlaceholderText('a').props.maxLength).toBe(9);
    expect(fuera.getByDisplayValue('hola')).toBeTruthy();
    await fuera.unmount();

    sheet.internal = {};
    const dentro = await render(
      <SheetTextInput placeholder="a" value="hola" onChangeText={onChangeText} maxLength={9} />,
    );
    await fireEvent.changeText(dentro.getByTestId('sheet-text-input'), 'otro');
    expect(onChangeText).toHaveBeenLastCalledWith('otro');
    expect(dentro.getByTestId('sheet-text-input').props.maxLength).toBe(9);
  });
});
