# E2E funcionales de la app MiCasita

La referencia versionada es [catalog.json](catalog.json): contiene los pasos,
precondiciones y resultados esperados de los **44 casos de la app**.
[TRACEABILITY.md](TRACEABILITY.md) los relaciona con los flujos y sus comprobaciones.
El catálogo conserva los identificadores originales; CP005 (limpieza ETL) se
retiró del alcance por probar un proceso de datos sin interacción con la app.

Los 44 casos activos se ejecutan desde la interfaz con Maestro (CP001
se divide en registro y OTP). [catalog.json](catalog.json) conserva los originales
en `cases`, la referencia histórica retirada en `excluded_cases` y el SHA256 del documento de origen como metadato de procedencia. Que una
prueba esté implementada no significa que esté aprobada: consultar su informe.

El documento de origen y los informes externos no forman parte del repositorio
ni son necesarios para ejecutar la suite. Si se dispone del Excel original,
se puede comprobar que coincida con el catálogo de forma explícita:

```sh
npm run test:e2e -- --source-excel /ruta/al/Casos_de_Prueba_MiCasita.xlsx
```

Esta opción valida su SHA256 antes de ejecutar los casos solicitados.

La revisión de los 45 casos de la versión anterior identificó únicamente CP005 como ajeno al uso de la app.
CP030–CP036 usan las pantallas de administración de la propia app. CP043 prueba el
botón de contacto de la app y su integración con WhatsApp; sigue incluido y se
registra bloqueado mientras falte su precondición externa.

Los archivos Python y shell restantes preparan el entorno, aportan datos de
prueba y comprueban resultados de acciones realizadas en pantalla. No son casos
independientes de ETL, scraping o ejecución de procesos de negocio.

## Entorno

- AVD Android `Pixel_7a`, dispositivo `emulator-5554`.
- Simulador iOS disponible: iPhone 17 Pro, iOS 26.5. Los resultados iOS se registran por separado.
- App de desarrollo instalada: `pe.edu.upc.micasita`, con Metro en 8081 para
  Android y 8082 para iOS.
- Backend real en 8001; PostgreSQL en la base **micasita_e2e**.
- OSRM **público**: `routing.openstreetmap.de/routed-car`, `routed-bike` y
  `routed-foot`. Geocodificación pública real. No se usan mapas OSRM descargados.
- Modelo real de recomendaciones. No se inyectan puntajes ni franjas inventadas.
- Las fotos se seleccionan con los selectores nativos reales de Android e iOS.
  Se preparan seis imágenes identificables: `Pictures/MiCasitaE2E` en Android y
  la fototeca del simulador en iOS mediante `simctl addmedia`.
- Para evitar envíos externos, solo el transporte de correo y Cloudinary se
  sustituyen en el servidor E2E: OTP persistido real y fotos guardadas/servidas
  localmente. La creación, edición, autorización y moderación usan las rutas reales.

No ejecutar esta suite contra producción. El acceso de los scripts de datos está
limitado explícitamente a `micasita_e2e`. Metro recibe sus variables de entorno sin
editar ni borrar `.env` o `.env.local` del desarrollador.

## Preparación

Requiere dependencias de la app, Maestro en PATH o `~/.maestro/maestro/bin/maestro`,
Android SDK y `micasita-ai-backend/venv` con las dependencias del backend y de
`e2e/requirements.txt`. La base `micasita_e2e` debe existir.

## Ejecución en iOS

Se requiere Xcode con un runtime de iOS y la app nativa compilada e instalada
en el simulador; Expo Go no sustituye esa compilación. Consultar los UDID con:

```sh
xcrun simctl list devices available
```

En Xcode 27.2, la interfaz gráfica instalada se llama **Device Hub**. Para ver
el dispositivo que usa Maestro sin reiniciarlo:

```sh
open 'devices://device/open?id=UDID_DEL_SIMULADOR'
```

Abrir la vista del dispositivo antes de preparar Fotos: en esta ejecución, la
importación que se quedaba esperando con el simulador sin ventana terminó
correctamente al repetirla con Device Hub abierto.

Para iOS, iniciar los servicios en terminales separadas:

```sh
E2E_PLATFORM=ios bash e2e/run_backend.sh
E2E_PLATFORM=ios bash e2e/run_metro.sh
```

La app iOS usa `http://localhost:8001` y Metro en **8082**. Android conserva
`http://10.0.2.2:8001` y Metro 8081. No ejecutar las dos suites simultáneamente:
comparten la base E2E y cada caso prepara sus datos. Reiniciar el backend con la
plataforma correspondiente antes de cambiar de simulador.

Con la app instalada y el simulador iniciado:

```sh
npm run test:e2e -- --platform ios --device UDID_DEL_SIMULADOR
npm run test:e2e -- --platform ios --device UDID_DEL_SIMULADOR --cases CP038
```

Los lanzamientos iOS indican `RCT_jsLocation=localhost:8082` y
`RCT_enableDev=NO` como argumentos de texto. Así se usa el bundle E2E sin que
el módulo de entorno de desarrollo de Expo reemplace localhost con `.env.local`
de Android. Los archivos `.env` no se editan.

Si Expo CLI no encuentra la aplicación visual Simulator pero CoreSimulator sí
funciona, se puede compilar directamente con Xcode. En este equipo fue necesario
un deployment target de 15.1 para las dependencias antiguas con Xcode 27.2:

```sh
xcodebuild -workspace ios/micasitaapp.xcworkspace -scheme micasitaapp \
  -configuration Debug -destination id=UDID_DEL_SIMULADOR \
  -derivedDataPath e2e/results/ios-native-build \
  CODE_SIGNING_ALLOWED=NO IPHONEOS_DEPLOYMENT_TARGET=15.1 build
xcrun simctl install UDID_DEL_SIMULADOR \
  e2e/results/ios-native-build/Build/Products/Debug-iphonesimulator/MiCasita.app
```

El ejecutor usa `simctl` para detener la app e importar las fotos en iOS. Si la
importación a la fototeca nativa no termina en 60 segundos, CP024–CP026 se
registran como **BLOCKED** con `photo-setup.log`; no detienen el resto de casos.
La ausencia de WhatsApp también mantiene CP043 bloqueado. Estos bloqueos no
equivalen a pruebas aprobadas.

Si Fotos ya falló y volver a importarlas deja CoreSimulator sin responder, una
repetición puede conservar ese error real sin intentar la importación otra vez:

```sh
npm run test:e2e -- --platform ios --device UDID_DEL_SIMULADOR \
  --ios-photo-error-log e2e/results/suite-ios-FECHA-HORA/photo-setup.log
```

Esta opción exige un archivo existente y registra CP024–CP026 como bloqueados.
Para volver a comprobar Fotos después de reparar el simulador, omitir la opción.

Los paneles permiten acceder individualmente a sus controles y los formularios
cierran el teclado al desplazarse. Los flujos esperan el cierre de sus animaciones
y verifican la navegación antes de escribir las credenciales.

Las ejecuciones iOS generan `results/suite-ios-FECHA-HORA/`, con plataforma y UDID
en `environment.json`. El consolidador rechaza mezclar Android e iOS y produce
`consolidado-ios-*` para la plataforma Apple.

## Preparación de datos

Reconstruir los datos conocidos (este paso **borra únicamente la base E2E**):

```sh
cd ../micasita-ai-backend
PYTHONPATH=. venv/bin/python ../micasita-mobile-app/e2e/db/reset_and_seed.py
```

Desde la carpeta de la app, en terminales separadas:

```sh
bash e2e/run_backend.sh
```

```sh
bash e2e/run_metro.sh
```

Con el backend encendido, generar la referencia de recomendaciones reales:

```sh
bash e2e/prepare.sh
```

El script exige resultados y franjas reales antes de guardar la referencia. Si
el proveedor público está caído, se informa el error.

## Ejecución

```sh
npm run test:e2e
```

Para consultar los 44 casos activos sin iniciar servicios ni modificar datos:

```sh
npm run test:e2e -- --list
```

CP005 no se ejecuta por defecto y se rechaza si se solicita con `--cases CP005`.

Para un bloque o para repetir casos corregidos:

```sh
npm run test:e2e -- --cases CP003,CP004,CP009
npm run test:e2e -- --cases CP024,CP025,CP026
```

El ejecutor prepara las precondiciones de cada caso, limpia el estado de la app,
ejecuta los pasos, comprueba las postcondiciones y continúa aunque otro caso falle.
CP001 usa un correo nuevo y obtiene el OTP de la base aislada. CP002 comprueba que
no haya una cuenta duplicada. Los casos que modifican datos no dependen de que
otro caso haya pasado antes.

Para depuración de un flujo suelto (sin preparación/verificación de BD):

```sh
bash e2e/run_flow.sh CP038
```

Esta ejecución individual no reemplaza el caso completo gestionado por la suite.

## Resultados y evidencias

El [resumen versionado de iOS del 4 de noviembre de 2026](RESULTS.md)
consolida una pasada completa y sus repeticiones: **43 PASS, 0 FAIL y CP043 BLOCKED**
por WhatsApp. Los tres casos de fotografías aprobaron con el selector nativo de iOS.

Cada ejecución genera `e2e/results/suite-FECHA-HORA/`:

- `resumen.md`, `results.json` y `junit.xml` consolidado.
- Carpeta por caso con JUnit, capturas, comandos de Maestro, logcat y jerarquías
  de UI en los fallos.
- `api-events.jsonl` con las respuestas reales relevantes que recibió la app.
- `postcondiciones.log` o `error.log` con las verificaciones persistidas.

Estados: **PASS**, **FAIL** y **BLOCKED**. FAIL o BLOCKED hacen que el comando
termine con código distinto de cero. Los artefactos se conservan localmente y se
ignoran en Git. No se graban videos.

CP043 necesita WhatsApp instalado **y con sesión activa**. Su ausencia se informa
como BLOCKED; no se considera un aprobado ni se simula una conversación. El flujo
comprueba el número y el mensaje preparado sin enviarlo.

Los casos de mapas verifican las capturas originales con Pillow/numpy/scipy:
localizan el pin rojo del trabajo y las burbujas moradas. CP014/CP015 calculan el
punto de toque desde la captura del momento; no usan una posición fija del Pixel.
En Android inyectan ese toque con `adb shell input tap`, porque el toque de Maestro
no siempre llega a las anotaciones de MapLibre. En iOS convierten los píxeles de
la captura en porcentajes y usan el toque de Maestro. Se registra el método y el píxel.
Se exige que cambie el precio de la tarjeta al tocar otra vivienda. CP015 además
comprueba píxeles de la línea fuera del pin y la geometría vial y sus extremos en
la respuesta real de OSRM. Se conservan los puntos detectados y las capturas.
El detector usa la paleta actual de MiCasita; un cambio de tema exige actualizarlo.
No realiza OCR del texto dibujado dentro de las anotaciones nativas.

Los tests trabajan con el teclado real: usan IDs, cierran el teclado cuando
corresponde y desplazan el formulario hasta los controles inferiores. No se
modifican los datos ni se ocultan errores para forzar aprobados.

CP033 escribe el mismo motivo `Fotos borrosas E2E` en dos segmentos, con una
comprobación intermedia. En el build de desarrollo, las teclas físicas `RR` de
Maestro dentro de un Modal activan el atajo de recarga de React Native. Se exige
el texto completo en pantalla y su persistencia exacta; se confirma con el teclado
abierto para comprobar que el botón siga siendo accesible.

El 3 de noviembre de 2026 se acordó registrar CP043 como bloqueado por esta precondición.

Para consolidar una pasada completa y las repeticiones de los casos corregidos:

```sh
python3 e2e/merge_reports.py e2e/results/suite-FECHA-HORA e2e/results/suite-REPETICION
```

El informe conserva el historial y enlaza la evidencia original de cada resultado;
no presenta las repeticiones como una única pasada continua.
Si se consolidan ejecuciones históricas que incluían CP005, sus resultados se
conservan en `excluded.json` y se omiten de los totales y de JUnit de la app.

`flows/_onb.yaml` se conserva como flujo exploratorio previo y está excluido del catálogo de la suite.
