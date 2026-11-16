# E2E funcionales de la app MiCasita

La revisión de preparación y tiempos de los 44 CP se documenta en [OPTIMIZATION.md](OPTIMIZATION.md).

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
- Backend real en 8001; PostgreSQL en **micasita_e2e**, copia de **micasita_db** local
  poblada con el seed, más las cuentas y viviendas específicas de las pruebas.
- OSRM **público**: `routing.openstreetmap.de/routed-car`, `routed-bike` y
  `routed-foot`. Geocodificación pública real. No se usan mapas OSRM descargados.
- Modelo real de recomendaciones. No se inyectan puntajes ni franjas inventadas.
- Las fotos se seleccionan con los selectores nativos reales de Android e iOS.
  Se preparan seis imágenes identificables: `Pictures/MiCasitaE2E` en Android y
  la fototeca del simulador en iOS mediante `simctl addmedia`.
- Se desactiva el transporte de correo para evitar envíos externos; el OTP se
  persiste realmente. Las imágenes nuevas usan `IMAGE_STORAGE=local`, la misma
  implementación de disco del backend de desarrollo, sin sustituir el uploader
  de Cloudinary. Las imágenes existentes del seed conservan sus URLs.

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

Primero, la base local `micasita_db` debe estar poblada con el seed actual. Si se
quiere reconstruirla, desde el backend ejecutar `venv/bin/python scripts/local_database.py --rebuild-local`;
ese comando hace un respaldo y reemplaza explícitamente la base local.

Preparar E2E (este paso **reemplaza únicamente la base E2E**, con respaldo previo):

```sh
cd ../micasita-ai-backend
PYTHONPATH=. venv/bin/python ../micasita-mobile-app/e2e/db/reset_and_seed.py
```

La preparación clona `micasita_db`, conserva todas sus viviendas y agrega 25
viviendas y seis usuarios E2E. No reconstruye el esquema como un catálogo vacío.
Los datos del seed permanecen en la copia. Las cuentas de prueba usan los correos
de dominio `e2e-micasita.com`.

Los flujos de detalle, favoritos y moderación encuentran las viviendas de prueba
mediante los filtros de precio reales de la app. Se reservan 1301, 1501, 1601 y
1351, ausentes del seed actual. CP033 y CP036 verifican el catálogo filtrado vacío
y su respuesta HTTP después del rechazo o bloqueo, además del estado en BD.
La paginación CP006 se comprueba independientemente de los títulos del seed.

Al preparar una copia nueva, se archiva la referencia anterior de recomendaciones.
Se debe generar una nueva con `e2e/prepare.sh` antes de ejecutar la suite.

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

### Grabar iPhone: un video y timeline por CP

Con el iPhone abierto en Device Hub, el build de desarrollo instalado y los
servicios de iOS iniciados:

```sh
npm run test:e2e -- --platform ios --device UDID_DEL_SIMULADOR --record-video
```

Cada flujo marca su pantalla inicial después de preparar los datos y navegar.
La grabación comienza antes de la primera acción evaluada, con la app abierta y
sin el aviso de descarga de desarrollo. Conserva las acciones completas del caso
y mantiene el resultado final visible unos segundos. Los relanzamientos que son
parte de CP040/CP041 sí quedan registrados. CP001 conserva registro y OTP en un
solo video.

En `results/suite-ios-FECHA-HORA/`, `videos.md` enlaza todos los resultados. Cada
carpeta `CPxxx/` contiene su MP4 original, `timeline.md`, `timeline.csv`,
`timeline.json` y un SRT independiente. No se editan ni incrustan rótulos en los
videos. CP043 se informa sin video si no se cumple la precondición de WhatsApp.

Para una filmación sin imágenes importadas anteriormente, usar un simulador
limpio. La grabación no borra la fototeca del dispositivo existente.

Los datos visibles están definidos en [sample_data.json](sample_data.json):
nombres de personas, correos de ejemplo sin números ni códigos, títulos y
descripciones naturales. El registro usa un correo fijo de demostración cuya
cuenta anterior se elimina solo de la base aislada al preparar CP001. Las fotos
se descargan del catálogo existente y las nuevas cargas usan almacenamiento
local. Los identificadores técnicos permanecen en los archivos e informes.

### Grabar Android y generar el timeline

Con el emulador, Metro y el backend E2E ya iniciados:

```sh
python3 e2e/record_android.py --device emulator-5554
```

Ejecuta todos los casos con el mismo runner y graba su pantalla continuamente,
sin editar el video. Para grabar solo algunos, añadir `--cases CP003,CP006`.
Se requiere un Android cuyo `screenrecord` admita `--time-limit 0`; el Pixel 7a
de esta ejecución lo permite. No ejecutar otra suite ni manipular la app durante
la grabación: las pruebas controlan sus pantallas y comparten la base E2E.

Los archivos se generan en `e2e/results/recording-android-FECHA-HORA/`:

- `android-original.mp4`: video vertical de 720 × 1600, sin cortes ni rótulos.
- `timeline.md`, `timeline.csv` y `timeline.json`: inicio, fin, nombre y resultado
  de cada CP, incluyendo preparación y verificación posterior.
- `cases.srt`: subtítulos independientes para importar al editor; no modifican
  el MP4. Los casos bloqueados figuran en el timeline, sin simular su ejecución.
- `suite/`: informes y evidencias de esta pasada, incluidos los eventos reales
  `case-events.jsonl`; `execution.log` y `screenrecord.log` conservan los logs.

Las marcas se calculan respecto al inicio del comando ADB y pueden tener un
pequeño desfase por el arranque del encoder; no son marcas exactas por fotograma.
El JSON indica `capture_complete` tras verificar la duración del MP4 y los eventos
de todos los CP seleccionados. Si una prueba falla, se conserva ese resultado y
la grabación continúa con los demás casos.

El video se almacena primero en Android y después se copia a la Mac. Reservar
espacio suficiente en ambos. La tasa de 800 kb/s reduce el tamaño en este emulador;
el archivo temporal de Android se conserva hasta comprobar la copia local.

### Preparación y tiempo de cada caso

Un caso independiente necesita precondiciones controladas, pero no tiene que
repetir todas las pantallas de navegación de la app. En Android:

- CP006, CP007, CP008, CP011 y CP043 usan `common/catalog.yaml`: estado limpio y
  entrada al catálogo con el enlace real `micasitaapp://housing`.
- `common/user.yaml`, `common/owner.yaml` y `common/admin.yaml` preparan sus
  cuentas desde `micasitaapp://login`. Escriben las credenciales y envían el
  formulario real. El propietario termina en el catálogo para no repetir esa
  navegación en cada caso de publicación.
- Registro, correo duplicado, credenciales inválidas, bloqueo, cierre de sesión
  y persistencia también pueden empezar en el formulario. Se conservan sus
  comprobaciones de OTP, errores, cierre y relanzamiento, según el caso.
- CP038 mantiene el recorrido desde Perfil para cubrir también el acceso al
  formulario por navegación normal.

La entrada a Recomendaciones usa `common/open-recommendations.yaml` y comprueba
su encabezado antes de buscar tarjetas. El botón Publicar y la aplicación de
filtros comprueban que la pantalla cambió, con un máximo de dos reintentos ante
un toque que no se procesó. En Android se cierra mediante su botón el aviso de
LogBox del build de desarrollo si está presente; los mensajes permanecen en los
logs y los errores no se suprimen.

CP006 sigue verificando 10 viviendas iniciales, 20 después de desplazarse y
respuestas reales de páginas con `skip=0` y `skip=10`, ambas de 10 elementos.

En una comparación local del 5 de noviembre de 2026, el video completo de CP006,
incluida su preparación, pasó de 61,6 a 24,3 segundos. Son dos ejecuciones medidas,
no una duración garantizada. La mejora no recorta ni acelera el video.

Los casos siguen limpiando el estado de la app y preparando sus datos de forma
independiente. No se hereda la sesión que dejó otro CP. Los enlaces directos
acortan la navegación y no inyectan sesiones, respuestas ni resultados de negocio.
Los formularios, el teclado, los selectores de fotos, las acciones de moderación
y las comprobaciones en BD/HTTP permanecen en sus flujos.

El campo de dirección verifica el texto completo antes de esperar sugerencias.
Si la escritura pierde un carácter, el helper vuelve a escribirlo y deja la
evidencia del intento; no espera al geocodificador con una dirección incorrecta.
Los timeouts de búsqueda, rutas y animaciones se mantienen como límites máximos,
no se convierten en esperas fijas ni se eliminan para aparentar menor duración.

## Resultados y evidencias

El [resumen versionado de iOS del 4 de noviembre de 2026](RESULTS.md)
consolida una pasada completa y sus repeticiones: **43 PASS, 0 FAIL y CP043 BLOCKED**
por WhatsApp. Los tres casos de fotografías aprobaron con el selector nativo de iOS.
Esa ejecución usó el catálogo E2E anterior; no valida automáticamente la preparación
actual basada en la copia del seed.

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
