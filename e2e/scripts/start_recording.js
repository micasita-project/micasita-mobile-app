// Solo controla la captura local; las acciones de negocio siguen ejecutándose en pantalla.
if (typeof RECORDING_CONTROL_URL !== 'undefined' && RECORDING_CONTROL_URL) {
    var response = http.post(RECORDING_CONTROL_URL, {body: ''});
    if (response.status !== 200) {
        throw new Error('No se pudo iniciar la grabación: ' + response.body);
    }
}
