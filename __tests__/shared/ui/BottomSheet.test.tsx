import React from 'react';
import { BackHandler, Dimensions, Text } from 'react-native';
import { render, fireEvent, act } from '@testing-library/react-native';
import { BottomSheet } from '@/shared/ui/BottomSheet';
import { sheet, resetSheet } from '@/__tests__/_helpers/ui/mockGorhom';
import { flat } from '@/__tests__/_helpers/ui/host';

jest.mock('@gorhom/bottom-sheet', () => require('@/__tests__/_helpers/ui/mockGorhom').gorhomModule);

const mockInsets = { top: 30, bottom: 8, left: 0, right: 0 };
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => mockInsets,
}));

let backHandlers: Array<() => boolean>;
let removeSub: jest.Mock;

beforeEach(() => {
  resetSheet();
  sheet.present.mockClear();
  sheet.dismiss.mockClear();
  Object.assign(mockInsets, { top: 30, bottom: 8 });
  backHandlers = [];
  removeSub = jest.fn();
  jest.spyOn(BackHandler, 'addEventListener').mockImplementation(((_e: string, cb: () => boolean) => {
    backHandlers.push(cb);
    return { remove: removeSub };
  }) as any);
});

afterEach(() => jest.restoreAllMocks());

function setup(initial: Partial<React.ComponentProps<typeof BottomSheet>> = {}) {
  const onClose = jest.fn();
  const onClosed = jest.fn();
  const element = (props: Partial<React.ComponentProps<typeof BottomSheet>> = {}) => (
    <BottomSheet visible={false} onClose={onClose} onClosed={onClosed} {...initial} {...props}>
      <Text>Contenido</Text>
    </BottomSheet>
  );
  return { onClose, onClosed, element };
}

const userDismiss = () => act(async () => sheet.props.onDismiss());

describe('BottomSheet presentación', () => {
  it('presenta el panel al montarse con visible=true', async () => {
    const { element } = setup({ visible: true });
    await render(element());
    expect(sheet.present).toHaveBeenCalledTimes(1);
    expect(sheet.dismiss).not.toHaveBeenCalled();
  });

  it('no presenta ni descarta un panel que nunca se abrió', async () => {
    const { element } = setup({ visible: false });
    const { rerender } = await render(element());
    await rerender(element({ visible: false }));
    expect(sheet.present).not.toHaveBeenCalled();
    expect(sheet.dismiss).not.toHaveBeenCalled();
  });

  it('presenta al pasar de oculto a visible', async () => {
    const { element } = setup();
    const { rerender } = await render(element());
    await rerender(element({ visible: true }));
    expect(sheet.present).toHaveBeenCalledTimes(1);
  });

  it('descarta al pasar de visible a oculto', async () => {
    const { element } = setup({ visible: true });
    const { rerender } = await render(element());
    await rerender(element({ visible: false }));
    expect(sheet.dismiss).toHaveBeenCalledTimes(1);
  });

  it('un segundo visible=false no vuelve a descartar', async () => {
    const { element, onClose } = setup({ visible: true });
    const { rerender } = await render(element());
    await rerender(element({ visible: false }));
    await rerender(element({ visible: false, onClose: jest.fn() }));
    expect(sheet.dismiss).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('muestra los hijos', async () => {
    const { element } = setup();
    const { getByText } = await render(element());
    expect(getByText('Contenido')).toBeTruthy();
  });
});

describe('BottomSheet cierre', () => {
  it('un cierre del usuario llama a onClose una sola vez', async () => {
    const { element, onClose } = setup({ visible: true });
    await render(element());
    await userDismiss();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('un cierre del usuario también avisa con onClosed', async () => {
    const { element, onClosed } = setup({ visible: true });
    await render(element());
    await userDismiss();
    expect(onClosed).toHaveBeenCalledTimes(1);
  });

  it('tras el cierre del usuario, pasar visible a false no descarta de nuevo ni repite onClose', async () => {
    const { element, onClose } = setup({ visible: true });
    const { rerender } = await render(element());
    await userDismiss();
    await rerender(element({ visible: false }));
    expect(sheet.dismiss).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('cerrar por prop no llama a onClose pero sí a onClosed', async () => {
    const { element, onClose, onClosed } = setup({ visible: true });
    const { rerender } = await render(element());
    await rerender(element({ visible: false }));
    await userDismiss();
    expect(onClose).not.toHaveBeenCalled();
    expect(onClosed).toHaveBeenCalledTimes(1);
  });

  it('tras un cierre por prop, el siguiente cierre del usuario sí llama a onClose', async () => {
    const { element, onClose } = setup({ visible: true });
    const { rerender } = await render(element());
    await rerender(element({ visible: false }));
    await userDismiss();
    await rerender(element({ visible: true }));
    await userDismiss();
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(sheet.present).toHaveBeenCalledTimes(2);
  });

  it('funciona sin onClosed', async () => {
    const onClose = jest.fn();
    await render(
      <BottomSheet visible onClose={onClose}>
        <Text>x</Text>
      </BottomSheet>,
    );
    await userDismiss();
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe('BottomSheet botón atrás de Android', () => {
  it('no registra el listener si el panel está oculto', async () => {
    const { element } = setup({ visible: false });
    await render(element());
    expect(backHandlers).toHaveLength(0);
  });

  it('con el panel visible, atrás llama a onClose y consume el evento', async () => {
    const { element, onClose } = setup({ visible: true });
    await render(element());
    expect(backHandlers).toHaveLength(1);
    let handled: boolean | undefined;
    await act(async () => {
      handled = backHandlers[0]();
    });
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(handled).toBe(true);
  });

  it('usa el evento hardwareBackPress', async () => {
    const { element } = setup({ visible: true });
    await render(element());
    expect(BackHandler.addEventListener).toHaveBeenCalledWith('hardwareBackPress', expect.any(Function));
  });

  it('retira el listener al ocultarse', async () => {
    const { element } = setup({ visible: true });
    const { rerender } = await render(element());
    await rerender(element({ visible: false }));
    expect(removeSub).toHaveBeenCalledTimes(1);
  });

  it('retira el listener al desmontar', async () => {
    const { element } = setup({ visible: true });
    const { unmount } = await render(element());
    await unmount();
    expect(removeSub).toHaveBeenCalledTimes(1);
  });
});

describe('BottomSheet configuración del panel', () => {
  it('permite arrastrar el contenido por defecto', async () => {
    const { element } = setup();
    await render(element());
    expect(sheet.props.enableContentPanningGesture).toBe(true);
  });

  it('contentPanning=false desactiva el arrastre desde el contenido', async () => {
    const { element } = setup();
    await render(element({ contentPanning: false }));
    expect(sheet.props.enableContentPanningGesture).toBe(false);
  });

  it('limita la altura al 90% de la pantalla por defecto', async () => {
    const { element } = setup();
    await render(element());
    expect(sheet.props.maxDynamicContentSize).toBeCloseTo(Dimensions.get('window').height * 0.9);
  });

  it('maxHeightRatio ajusta el tope de altura', async () => {
    const { element } = setup();
    await render(element({ maxHeightRatio: 0.5 }));
    expect(sheet.props.maxDynamicContentSize).toBeCloseTo(Dimensions.get('window').height * 0.5);
  });

  it('crece con el contenido, se cierra deslizando y respeta el área superior', async () => {
    const { element } = setup();
    await render(element());
    expect(sheet.props.enableDynamicSizing).toBe(true);
    expect(sheet.props.enablePanDownToClose).toBe(true);
    expect(sheet.props.topInset).toBe(50);
  });

  it('el fondo oscurece y cierra al tocar', async () => {
    const { element } = setup();
    const { getByTestId } = await render(element());
    expect(getByTestId('sheet-backdrop').props).toMatchObject({
      appearsOnIndex: 0,
      disappearsOnIndex: -1,
      opacity: 0.5,
      pressBehavior: 'close',
    });
  });
});

describe('BottomSheet footer', () => {
  it('sin footer no registra footerComponent', async () => {
    const { element } = setup();
    const { queryByTestId } = await render(element());
    expect(sheet.props.footerComponent).toBeUndefined();
    expect(queryByTestId('sheet-footer')).toBeNull();
  });

  it('con footer lo muestra', async () => {
    const { element } = setup();
    const { getByTestId, getByText } = await render(element({ footer: <Text>Guardar</Text> }));
    expect(getByTestId('sheet-footer')).toBeTruthy();
    expect(getByText('Guardar')).toBeTruthy();
  });

  it('el relleno inferior del footer es al menos 16', async () => {
    const { element } = setup();
    const { getByText } = await render(element({ footer: <Text>Guardar</Text> }));
    expect(flat(getByText('Guardar').parent!).paddingBottom).toBe(16);
  });

  it('el relleno inferior del footer respeta un área segura mayor', async () => {
    mockInsets.bottom = 34;
    const { element } = setup();
    const { getByText } = await render(element({ footer: <Text>Guardar</Text> }));
    expect(flat(getByText('Guardar').parent!).paddingBottom).toBe(34);
  });

  it('sin footer el contenido deja insets.bottom + 16 de margen inferior', async () => {
    const { element } = setup();
    const { getByTestId } = await render(element());
    expect(flat({ props: { style: getByTestId('sheet-scroll').props.contentContainerStyle } }).paddingBottom).toBe(24);
  });

  it('con footer el margen inferior del contenido es la altura medida del footer', async () => {
    const { element } = setup();
    const { getByTestId, getByText } = await render(element({ footer: <Text>Guardar</Text> }));
    await fireEvent(getByText('Guardar').parent!, 'layout', { nativeEvent: { layout: { height: 72 } } });
    expect(getByTestId('sheet-scroll').props.contentContainerStyle.paddingBottom).toBe(72);
  });

  it('mantiene el desplazamiento táctil con el teclado abierto y sin barra de scroll', async () => {
    const { element } = setup();
    const { getByTestId } = await render(element());
    expect(getByTestId('sheet-scroll').props).toMatchObject({
      keyboardShouldPersistTaps: 'handled',
      showsVerticalScrollIndicator: false,
    });
  });
});
