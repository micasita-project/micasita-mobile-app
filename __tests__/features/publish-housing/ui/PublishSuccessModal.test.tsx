import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { PublishSuccessModal } from '@/features/publish-housing/ui/PublishSuccessModal';

const onViewMyListings = jest.fn();
const onClose = jest.fn();

const setup = (props: { visible?: boolean; isEdit?: boolean } = {}) =>
  render(
    <PublishSuccessModal
      visible={props.visible ?? true}
      isEdit={props.isEdit}
      onViewMyListings={onViewMyListings}
      onClose={onClose}
    />,
  );

describe('PublishSuccessModal', () => {
  it('oculto no muestra el contenido', async () => {
    await setup({ visible: false });
    expect(screen.queryByText('¡Publicado exitosamente!')).toBeNull();
  });

  it('al publicar informa que el anuncio está en revisión', async () => {
    await setup();
    expect(screen.getByText('¡Publicado exitosamente!')).toBeTruthy();
    expect(screen.getByText('Tu anuncio fue enviado y está en revisión.')).toBeTruthy();
    expect(screen.getByText('Estado: Pendiente de validación')).toBeTruthy();
    expect(screen.getByText('3 días hábiles')).toBeTruthy();
  });

  it('al editar cambia el título y el mensaje', async () => {
    await setup({ isEdit: true });
    expect(screen.getByText('¡Actualizado exitosamente!')).toBeTruthy();
    expect(screen.getByText('Tu anuncio fue actualizado y está en revisión.')).toBeTruthy();
    expect(screen.queryByText('¡Publicado exitosamente!')).toBeNull();
  });

  it('muestra las tres etapas del proceso', async () => {
    await setup();
    expect(screen.getByText('Publicado')).toBeTruthy();
    expect(screen.getByText('Pendiente')).toBeTruthy();
    expect(screen.getByText('Aprobado')).toBeTruthy();
  });

  it('Ver mis publicaciones llama a su callback y no al de cierre', async () => {
    await setup();
    await fireEvent.press(screen.getByText('Ver mis publicaciones'));
    expect(onViewMyListings).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('Volver a Viviendas llama a onClose y no al de publicaciones', async () => {
    await setup();
    await fireEvent.press(screen.getByText('Volver a Viviendas'));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onViewMyListings).not.toHaveBeenCalled();
  });
});
