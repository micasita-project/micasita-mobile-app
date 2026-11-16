# Resultados E2E de MiCasita

## iOS: grabación individual iniciada el 5 y finalizada el 6 de noviembre de 2026

| Plataforma | Dispositivo | PASS | FAIL | BLOCKED |
| --- | --- | --- | --- | --- |
| iOS 26.5 | iPhone 17 Pro - MiCasita | 43 | 0 | 1 |

Se generaron **43 videos originales**, uno por caso ejecutado, y **44 timelines**
en Markdown, CSV y JSON. CP043 conserva su bloqueo por WhatsApp y no tiene un
video que simule su ejecución. Las grabaciones suman **20 min 39 s** y unos
**762 MB**, en H.264 vertical a 1206 × 2622. Los SRT son archivos independientes;
no hay rótulos incrustados ni edición del MP4.

Cada captura empieza con la app abierta y la pantalla inicial preparada, antes
de la primera acción evaluada. La navegación de preparación queda fuera del
clip; los relanzamientos y cambios de cuenta que forman parte del caso se
conservan. CP001 agrupa registro y OTP en un único video.

Se usaron nombres de personas, correos de ejemplo sin números ni códigos y textos
naturales definidos en [sample_data.json](sample_data.json). Las fotos se
obtuvieron del catálogo existente. Se preparó un simulador limpio conservando
la fototeca anterior. El build iOS incorpora el icono de MiCasita y el splash
morado, regenerados desde la configuración de Expo.

El resultado consolida `suite-ios-20261105-232929` y
`suite-ios-20261106-002503`. La pasada inicial registró 39 PASS, 4 FAIL y 1 BLOCKED:
CP028 necesitó corregir el sentido de desplazamiento; CP032, verificar cada dígito
del filtro; CP044/CP045 completaron sus acciones pero no tenían el punto de inicio
de grabación. Los cuatro se repitieron y aprobaron con video. No se presenta como
una única pasada continua sin fallos.

La carpeta de entrega local es `grabaciones-iphone-20261106-003233`, con un índice
`videos.md` y su CSV. Contiene la última grabación de cada CP; las anteriores se
conservan en los informes de origen y en el historial. Se verificaron la duración,
la cobertura hasta el resultado final y los límites de cada timeline. Los SHA256
de las copias coinciden con los originales.

Esta ejecución valida el backend real y la copia del seed completo en
`micasita_e2e`, con OSRM y geocodificación públicos, recomendaciones reales y
cargas nuevas de imágenes en disco local. Solo se sustituye el transporte de
correo. Se validaron también las referencias de los 44 flujos y la sintaxis de
los scripts de soporte.


## Histórico Android: validación del 5 de noviembre de 2026

Referencia: los **44 casos activos** de [catalog.json](catalog.json), relacionados
con sus flujos en [TRACEABILITY.md](TRACEABILITY.md). La revisión y las duraciones
individuales se encuentran en [OPTIMIZATION.md](OPTIMIZATION.md).

| Plataforma | Dispositivo | PASS | FAIL | BLOCKED |
| --- | --- | --- | --- | --- |
| Android 17 / API 37 | Pixel 7a, emulator-5554 | 43 | 0 | 1 |

Se ejecutaron los 44 casos: la pasada inicial terminó con 37 PASS, 6 FAIL y
1 BLOCKED. Después se corrigieron y repitieron CP003, CP004, CP016, CP017, CP019 y
CP020, junto con CP006 como control; los siete aprobaron. El resultado consolidado
conserva ese historial y no representa una única pasada continua sin fallos.

CP043 permanece **BLOCKED** porque WhatsApp no está instalado y con sesión activa,
según lo acordado. No se contabiliza como aprobado.

Esta ejecución usa el backend real, PostgreSQL en `micasita_e2e` como copia de la
base local poblada con las 1356 viviendas del seed y fixtures adicionales,
geocodificación y OSRM públicos, y el modelo real de recomendaciones. Las acciones
de pantalla se verificaron también mediante postcondiciones en BD/HTTP. Las fotos
se seleccionaron con el selector nativo y las imágenes nuevas se almacenaron en
disco con el proveedor local del backend. Solo se sustituye el transporte de correo.

La revisión acortó la navegación de preparación mediante enlaces reales al
catálogo, login y Recomendaciones. Conservó el login desde Perfil en CP038, los
relanzamientos de sesión, el teclado, las validaciones y los formularios completos.
Se corrigió la escritura incompleta de direcciones y se añadieron comprobaciones
de navegación tras los toques en Publicar y Aplicar filtros. Los avisos de LogBox
del build de desarrollo se cierran desde su botón cuando aparecen, sin eliminar
los mensajes de los logs ni suprimir errores.

Validación adicional tras el cambio de configuración del campo de dirección:
**90 suites unitarias y 1502 pruebas aprobadas**. ESLint del archivo modificado:
**0 errores y 0 advertencias**.

## Histórico Android: grabación del 5 de noviembre de 2026

La grabación `recording-android-20261105-213228` terminó con 29 PASS, 14 FAIL y
1 BLOCKED. Diez fallos fueron de infraestructura antes de las acciones de la app: dos
instalaciones del controlador rechazadas por espacio insuficiente y ocho
`DeviceServerDiedException` al consultar `deviceInfo`. Los otros cuatro
fueron CP021/CP022 por controles tapados y CP025/CP026 por imágenes no almacenadas.
No se completó la validación de esa captura ni se hicieron sus repeticiones al
cambiar la tarea a la generación del APK. Este resultado es distinto de la
validación Android anterior y se conserva sin presentarlo como aprobado.

## Histórico iOS: 4 de noviembre de 2026

| Plataforma | Dispositivo | PASS | FAIL | BLOCKED |
| --- | --- | --- | --- | --- |
| iOS 26.5 | iPhone 17 Pro, Device Hub | 43 | 0 | 1 |

Este resultado corresponde al catálogo E2E pequeño anterior y consolida su pasada
completa y sus repeticiones. CP024–CP026 aprobaron con Fotos nativo; CP043 quedó
bloqueado por WhatsApp. La consolidación registrada fue
`consolidado-ios-20261104-153533`.

Este histórico no valida por sí solo los cambios posteriores; la ejecución
individual descrita al inicio de este documento sí comprobó el seed completo
y los datos de demostración nuevos en iOS.

## Evidencias y reproducción

Las capturas, respuestas HTTP, logs, JUnit e historial detallado se generan en
`e2e/results/`, ignorado por Git. No se incluyen enlaces a esos archivos locales
porque no están disponibles al clonar el repositorio. Una nueva ejecución genera
sus propias evidencias.

La consolidación Android registrada es `consolidado-20261105-141433`, a partir de
`suite-20261105-132434` y `suite-20261105-140639`. El consolidador devuelve código 1
si queda un caso bloqueado, aunque no haya fallos. Para preparar el entorno,
ejecutar los casos y consolidar sus resultados, consultar [README.md](README.md).
