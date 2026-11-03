import React from 'react';
import { Alert } from 'react-native';
import { render, fireEvent, screen, act } from '@testing-library/react-native';
import * as ImagePicker from 'expo-image-picker';
import { PublishWizard } from '@/features/publish-housing/ui/PublishWizard';
import { submitHousingListing, updateHousingListing } from '@/features/publish-housing/model/publishHousing.service';
import {
  getPublishDraft,
  savePublishDraft,
  clearPublishDraft,
} from '@/features/publish-housing/model/publishDraft.storage';
import { makeSuggestion, setNextSuggestion, resetNextSuggestion } from '@/__tests__/_helpers/features/mockFeatureUi';

const mockRouter = { back: jest.fn(), replace: jest.fn(), push: jest.fn() };
const mockAuth: any = { user: { id: 7, email: 'ana@mail.com' } };

jest.mock('expo-router', () => {
  const React = require('react');
  return {
    useRouter: () => mockRouter,
    useFocusEffect: (cb: () => void | (() => void)) => React.useEffect(cb, [cb]),
  };
});
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
}));
jest.mock('@/features/auth', () => ({ useAuth: () => mockAuth }));
jest.mock('@/features/publish-housing/model/publishHousing.service', () => ({
  submitHousingListing: jest.fn(),
  updateHousingListing: jest.fn(),
}));
jest.mock('@/features/publish-housing/model/publishDraft.storage', () => ({
  getPublishDraft: jest.fn(),
  savePublishDraft: jest.fn(),
  clearPublishDraft: jest.fn(),
}));
jest.mock('@/shared/ui/StepIndicator', () => ({
  StepIndicator: ({ totalSteps, currentStep, labels }: any) => {
    const { Text } = require('react-native');
    return <Text testID="step-indicator">{`${currentStep}/${totalSteps}:${labels.join(',')}`}</Text>;
  },
}));
jest.mock('@/shared/ui/AddressSearchInput', () => require('@/__tests__/_helpers/features/mockFeatureUi').addressSearchModule);
jest.mock('@/shared/ui/map', () => require('@/__tests__/_helpers/features/mockFeatureUi').mapModule);
jest.mock('@/widgets/location-picker/MapPickerModal', () => require('@/__tests__/_helpers/features/mockFeatureUi').mapPickerModule);

const submitMock = submitHousingListing as jest.Mock;
const updateMock = updateHousingListing as jest.Mock;
const getDraftMock = getPublishDraft as jest.Mock;
const saveDraftMock = savePublishDraft as jest.Mock;
const clearDraftMock = clearPublishDraft as jest.Mock;
let alertSpy: jest.SpyInstance;

const FULL_DRAFT = {
  address: 'Av. Perú 100, Miraflores',
  district: 'Miraflores',
  latitude: -12.12,
  longitude: -77.03,
  title: 'Depa luminoso',
  property_type: 'Departamento',
  currency: 'PEN',
  price: 2500,
  total_area_sqm: 80,
  covered_area_sqm: 70,
  bedrooms: 2,
  bathrooms: 1,
  parking: 0,
  antiquity: 3,
  description: 'Muy cómodo',
  phone: '987654321',
  localImageUris: ['file:///a.jpg'],
  features: ['WiFi'],
};

beforeEach(() => {
  mockAuth.user = { id: 7, email: 'ana@mail.com' };
  getDraftMock.mockResolvedValue(null);
  clearDraftMock.mockResolvedValue(undefined);
  saveDraftMock.mockResolvedValue(undefined);
  submitMock.mockResolvedValue({});
  updateMock.mockResolvedValue({});
  (ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });
  resetNextSuggestion();
  alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});

const alertCalls = (title: string) => alertSpy.mock.calls.filter((c) => c[0] === title);
const type = (placeholder: string, text: string) =>
  fireEvent.changeText(screen.getByPlaceholderText(placeholder), text);
const next = () => fireEvent.press(screen.getByText('Siguiente'));

async function fillStep1() {
  setNextSuggestion(makeSuggestion({ display_name: 'Av. Perú 100, Miraflores', district: 'Miraflores' }));
  await fireEvent.press(screen.getByTestId('address-pick'));
  await next();
}

async function fillStep2() {
  await type('Ej: Departamento Moderno en Surco', 'Depa luminoso');
  await type('3900', '2500');
  await type('Total m²', '80');
  await type('Describe las características más destacadas de tu propiedad…', 'Muy cómodo');
  await next();
}

async function fillStep3() {
  (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
    canceled: false,
    assets: [{ uri: 'file:///a.jpg' }],
  });
  await fireEvent.press(screen.getByText('Toca para agregar fotos'));
  await next();
}

async function reachStep4() {
  await render(<PublishWizard />);
  await fillStep1();
  await fillStep2();
  await fillStep3();
}

describe('PublishWizard navegación y validaciones', () => {
  it('empieza en el paso 1 sin botón Atrás', async () => {
    await render(<PublishWizard />);
    expect(screen.getByText('Publicar vivienda')).toBeTruthy();
    expect(screen.getByText('Paso 1 de 4')).toBeTruthy();
    expect(screen.getByTestId('step-indicator').props.children).toBe(
      '1/4:Ubicación,Características,Fotos,Amenidades',
    );
    expect(screen.queryByText('Atrás')).toBeNull();
  });

  it('el botón de volver del encabezado solo existe en el paso 1 y sale de la pantalla', async () => {
    await render(<PublishWizard />);
    const header = screen.getByText('Publicar vivienda').parent!.parent!;
    await fireEvent.press(header.children[0] as any);
    expect(mockRouter.back).toHaveBeenCalledTimes(1);
    await fillStep1();
    const header2 = screen.getByText('Publicar vivienda').parent!.parent!;
    expect(header2.children).toHaveLength(1);
  });

  it('Siguiente sin dirección avisa y no avanza', async () => {
    await render(<PublishWizard />);
    await next();
    expect(alertSpy).toHaveBeenCalledWith('Datos incompletos', 'Por favor ingresa la dirección.');
    expect(screen.getByText('Paso 1 de 4')).toBeTruthy();
  });

  it('con dirección elegida avanza al paso 2 y aparece Atrás', async () => {
    await render(<PublishWizard />);
    await fillStep1();
    expect(screen.getByText('Paso 2 de 4')).toBeTruthy();
    expect(screen.getByText('Atrás')).toBeTruthy();
  });

  it('Atrás vuelve al paso anterior conservando lo escrito', async () => {
    await render(<PublishWizard />);
    await fillStep1();
    await fireEvent.press(screen.getByText('Atrás'));
    expect(screen.getByText('Paso 1 de 4')).toBeTruthy();
    expect(screen.getByTestId('address-input').props.value).toBe('Av. Perú 100, Miraflores');
  });

  it('el paso 2 exige título antes de avanzar', async () => {
    await render(<PublishWizard />);
    await fillStep1();
    await next();
    expect(alertSpy).toHaveBeenCalledWith('Datos incompletos', 'Por favor ingresa el título del anuncio.');
    expect(screen.getByText('Paso 2 de 4')).toBeTruthy();
  });

  it('el paso 3 exige al menos una foto', async () => {
    await render(<PublishWizard />);
    await fillStep1();
    await fillStep2();
    await next();
    expect(alertSpy).toHaveBeenCalledWith(
      'Datos incompletos',
      'Por favor agrega al menos una foto de la propiedad.',
    );
    expect(screen.getByText('Paso 3 de 4')).toBeTruthy();
  });

  it('en el paso 4 ofrece publicar en lugar de Siguiente', async () => {
    await reachStep4();
    expect(screen.getByText('Paso 4 de 4')).toBeTruthy();
    expect(screen.getByText('Publicar anuncio')).toBeTruthy();
    expect(screen.queryByText('Siguiente')).toBeNull();
  });
});

describe('PublishWizard selector de mapa', () => {
  it('abre el selector centrado en las coordenadas del borrador', async () => {
    await render(<PublishWizard />);
    await fireEvent.press(screen.getByText('Elegir en el mapa'));
    expect(JSON.parse(screen.getByTestId('map-picker-region').props.children)).toEqual({
      latitude: -12.0464,
      longitude: -77.0428,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    });
  });

  it('confirmar una ubicación rellena dirección y coordenadas y cierra el selector', async () => {
    await render(<PublishWizard />);
    await fireEvent.press(screen.getByText('Elegir en el mapa'));
    setNextSuggestion(makeSuggestion({ display_name: 'Calle Mar 5', latitude: -12.1, longitude: -77.05, district: 'Barranco' }));
    await fireEvent.press(screen.getByTestId('map-picker-confirm'));
    expect(screen.queryByTestId('map-picker')).toBeNull();
    expect(screen.getByTestId('address-input').props.value).toBe('Calle Mar 5');
    expect(screen.getByTestId('marker').props.coordinate).toEqual({ latitude: -12.1, longitude: -77.05 });
    await next();
    expect(screen.getByText('Paso 2 de 4')).toBeTruthy();
  });

  it('sin distrito en la ubicación usa Lima y permite continuar', async () => {
    await render(<PublishWizard />);
    await fireEvent.press(screen.getByText('Elegir en el mapa'));
    setNextSuggestion(makeSuggestion({ display_name: 'Calle Mar 5' }));
    await fireEvent.press(screen.getByTestId('map-picker-confirm'));
    await next();
    expect(alertSpy).not.toHaveBeenCalled();
    expect(screen.getByText('Paso 2 de 4')).toBeTruthy();
  });

  it('cerrar el selector no cambia el borrador', async () => {
    await render(<PublishWizard />);
    await fireEvent.press(screen.getByText('Elegir en el mapa'));
    await fireEvent.press(screen.getByTestId('map-picker-close'));
    expect(screen.queryByTestId('map-picker')).toBeNull();
    expect(screen.getByTestId('address-input').props.value).toBe('');
  });
});

describe('PublishWizard publicación', () => {
  it('publica con el borrador completo y el usuario autenticado', async () => {
    await reachStep4();
    await fireEvent.press(screen.getByText('WiFi'));
    await fireEvent.press(screen.getByText('Publicar anuncio'));
    expect(submitMock).toHaveBeenCalledTimes(1);
    const [draft, userId, email] = submitMock.mock.calls[0];
    expect(userId).toBe('7');
    expect(email).toBe('ana@mail.com');
    expect(draft).toMatchObject({
      address: 'Av. Perú 100, Miraflores',
      district: 'Miraflores',
      title: 'Depa luminoso',
      price: 2500,
      total_area_sqm: 80,
      description: 'Muy cómodo',
      localImageUris: ['file:///a.jpg'],
      features: ['WiFi'],
    });
    expect(updateMock).not.toHaveBeenCalled();
  });

  it('tras publicar muestra el modal de éxito y borra el borrador guardado', async () => {
    await reachStep4();
    await fireEvent.press(screen.getByText('Publicar anuncio'));
    expect(screen.getByText('¡Publicado exitosamente!')).toBeTruthy();
    expect(clearDraftMock).toHaveBeenCalledTimes(1);
  });

  it('sin usuario autenticado avisa y no publica', async () => {
    mockAuth.user = null;
    await reachStep4();
    await fireEvent.press(screen.getByText('Publicar anuncio'));
    expect(alertSpy).toHaveBeenCalledWith('Error', 'Debes estar autenticado para publicar.');
    expect(submitMock).not.toHaveBeenCalled();
    expect(screen.queryByText('¡Publicado exitosamente!')).toBeNull();
  });

  it('si falla la publicación avisa, no muestra éxito y conserva el borrador', async () => {
    submitMock.mockRejectedValue(new Error('Servidor caído'));
    await reachStep4();
    await fireEvent.press(screen.getByText('Publicar anuncio'));
    expect(alertCalls('Error al publicar')).toHaveLength(1);
    expect(screen.queryByText('¡Publicado exitosamente!')).toBeNull();
    expect(clearDraftMock).not.toHaveBeenCalled();
    expect(screen.getByText('Publicar anuncio')).toBeTruthy();
  });

  it('si falla la publicación el aviso muestra el motivo del error', async () => {
    submitMock.mockRejectedValue(new Error('Servidor caído'));
    await reachStep4();
    await fireEvent.press(screen.getByText('Publicar anuncio'));
    expect(alertSpy).toHaveBeenCalledWith('Error al publicar', 'Servidor caído');
  });

  it('mientras publica deshabilita los botones y oculta el texto', async () => {
    let release!: () => void;
    submitMock.mockReturnValue(new Promise<void>((r) => (release = r)));
    await reachStep4();
    let press!: Promise<unknown>;
    await act(async () => {
      press = fireEvent.press(screen.getByText('Publicar anuncio'));
    });
    expect(screen.queryByText('Publicar anuncio')).toBeNull();
    const disabled = screen.container.queryAll((n) => n.props.accessibilityState?.disabled === true);
    expect(disabled).toHaveLength(2);
    await act(async () => {
      release();
      await press;
    });
    expect(screen.getByText('¡Publicado exitosamente!')).toBeTruthy();
  });

  it('Ver mis publicaciones cierra el éxito, reinicia el asistente y navega', async () => {
    await reachStep4();
    await fireEvent.press(screen.getByText('Publicar anuncio'));
    await fireEvent.press(screen.getByText('Ver mis publicaciones'));
    expect(mockRouter.replace).toHaveBeenCalledWith('/my-listings');
    expect(screen.queryByText('¡Publicado exitosamente!')).toBeNull();
    expect(screen.getByText('Paso 1 de 4')).toBeTruthy();
    expect(screen.getByTestId('address-input').props.value).toBe('');
  });

  it('Volver a Viviendas cierra el éxito, reinicia el asistente y retrocede', async () => {
    await reachStep4();
    await fireEvent.press(screen.getByText('Publicar anuncio'));
    await fireEvent.press(screen.getByText('Volver a Viviendas'));
    expect(mockRouter.back).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('¡Publicado exitosamente!')).toBeNull();
    expect(screen.getByText('Paso 1 de 4')).toBeTruthy();
  });
});

describe('PublishWizard modo edición', () => {
  const setupEdit = () => render(<PublishWizard initialDraft={FULL_DRAFT} propertyId="p-42" />);

  it('muestra el título de edición y los datos de la vivienda', async () => {
    await setupEdit();
    expect(screen.getByText('Editar vivienda')).toBeTruthy();
    expect(screen.getByTestId('address-input').props.value).toBe(FULL_DRAFT.address);
  });

  it('no consulta el borrador guardado', async () => {
    await setupEdit();
    expect(getDraftMock).not.toHaveBeenCalled();
    expect(alertCalls('Borrador encontrado')).toHaveLength(0);
  });

  it('actualiza con el identificador y el borrador, sin crear ni borrar borrador', async () => {
    await setupEdit();
    await next();
    await next();
    await next();
    expect(screen.getByText('Actualizar anuncio')).toBeTruthy();
    await fireEvent.press(screen.getByText('Actualizar anuncio'));
    expect(updateMock).toHaveBeenCalledWith('p-42', expect.objectContaining({ title: 'Depa luminoso' }));
    expect(submitMock).not.toHaveBeenCalled();
    expect(clearDraftMock).not.toHaveBeenCalled();
    expect(screen.getByText('¡Actualizado exitosamente!')).toBeTruthy();
  });

  it('si falla la actualización lo indica con su propio título', async () => {
    updateMock.mockRejectedValue(new Error('x'));
    await setupEdit();
    await next();
    await next();
    await next();
    await fireEvent.press(screen.getByText('Actualizar anuncio'));
    expect(alertCalls('Error al actualizar')).toHaveLength(1);
    expect(screen.queryByText('¡Actualizado exitosamente!')).toBeNull();
  });

  it('al salir no guarda borrador', async () => {
    const view = await setupEdit();
    await view.unmount();
    expect(saveDraftMock).not.toHaveBeenCalled();
  });
});

describe('PublishWizard borrador guardado', () => {
  it('sin borrador no muestra aviso', async () => {
    await render(<PublishWizard />);
    expect(getDraftMock).toHaveBeenCalledTimes(1);
    expect(alertCalls('Borrador encontrado')).toHaveLength(0);
  });

  it('con borrador ofrece recuperarlo o ignorarlo', async () => {
    getDraftMock.mockResolvedValue(FULL_DRAFT);
    await render(<PublishWizard />);
    expect(alertSpy).toHaveBeenCalledWith(
      'Borrador encontrado',
      'Tienes un borrador anterior sin publicar. ¿Deseas recuperarlo?',
      [
        expect.objectContaining({ text: 'Ignorar', style: 'cancel' }),
        expect.objectContaining({ text: 'Recuperar' }),
      ],
    );
  });

  it('Recuperar carga los datos del borrador en el asistente', async () => {
    getDraftMock.mockResolvedValue(FULL_DRAFT);
    await render(<PublishWizard />);
    const buttons = alertSpy.mock.calls[0][2];
    await act(async () => {
      buttons.find((b: any) => b.text === 'Recuperar').onPress();
    });
    expect(screen.getByTestId('address-input').props.value).toBe(FULL_DRAFT.address);
    expect(clearDraftMock).not.toHaveBeenCalled();
  });

  it('Ignorar borra el borrador guardado', async () => {
    getDraftMock.mockResolvedValue(FULL_DRAFT);
    await render(<PublishWizard />);
    const buttons = alertSpy.mock.calls[0][2];
    await act(async () => {
      buttons.find((b: any) => b.text === 'Ignorar').onPress();
    });
    expect(clearDraftMock).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('address-input').props.value).toBe('');
  });

  it('al salir guarda el borrador con lo escrito', async () => {
    const view = await render(<PublishWizard />);
    await fireEvent.changeText(screen.getByTestId('address-input'), 'Av. Sol 1');
    saveDraftMock.mockClear();
    await view.unmount();
    expect(saveDraftMock).toHaveBeenLastCalledWith(expect.objectContaining({ address: 'Av. Sol 1' }));
  });

  it('tras publicar con éxito no vuelve a guardar el borrador al salir', async () => {
    await reachStep4();
    const view = screen;
    await fireEvent.press(view.getByText('Publicar anuncio'));
    saveDraftMock.mockClear();
    await act(async () => {
      view.unmount();
    });
    expect(saveDraftMock).not.toHaveBeenCalled();
  });
});
