# Trazabilidad E2E de la app: 44 casos activos

Referencia versionada: [catalog.json](catalog.json), con los pasos, precondiciones
y resultados esperados de cada caso. El documento externo de origen no es
necesario para consultar esta matriz ni para ejecutar la suite.

Esta matriz describe cobertura implementada. Los resultados ejecutados se registran en `results/suite-*/resumen.md` (Android) y `results/suite-ios-*/resumen.md` (iOS); tener un archivo no equivale a una prueba aprobada. Los informes consolidados no mezclan plataformas.

Ejecución iOS del **4 de noviembre de 2026**: iPhone 17 Pro, iOS 26.5, Device Hub.
Resultado consolidado de la pasada completa y sus repeticiones: **43 PASS, 0 FAIL,
1 BLOCKED (CP043, WhatsApp)**. CP024–CP026 aprobaron con el selector nativo de Fotos.
[Resumen versionado de resultados de iOS](RESULTS.md).

El catálogo contiene **44 casos de prueba activos**. CP005 (HU03, limpieza ETL)
permanece únicamente como referencia histórica excluida. Se mantienen los
identificadores de los demás casos, sin renumerarlos.

| Caso | Nombre original | Implementación | Verificación adicional |
| --- | --- | --- | --- |
| CP001 | Registrar un usuario nuevo con datos válidos | [CP001_a.yaml](flows/CP001_a.yaml) + [CP001_b.yaml](flows/CP001_b.yaml) | Registro + OTP real; onboarding |
| CP002 | Impedir el registro con un correo ya registrado | [CP002.yaml](flows/CP002.yaml) | Cuenta única en BD |
| CP003 | Guardar un lugar de trabajo con una dirección válida de Lima | [CP003.yaml](flows/CP003.yaml) | Trabajo y coordenadas persistidos; pin visible en captura |
| CP004 | Rechazar una dirección no seleccionada de la lista o fuera de Lima | [CP004.yaml](flows/CP004.yaml) | Sin trabajo inválido persistido |
| CP006 | Mostrar el catálogo de 10 en 10 con carga al desplazarse | [CP006.yaml](flows/CP006.yaml) | Peticiones de páginas 0 y 10 con 10 elementos |
| CP007 | Mostrar solo las viviendas aprobadas | [CP007.yaml](flows/CP007.yaml) | Estados de todas las respuestas públicas |
| CP008 | Filtrar viviendas por rango de precio | [CP008.yaml](flows/CP008.yaml) | Precios de cada respuesta filtrada |
| CP009 | Mostrar las recomendaciones ordenadas por puntaje de coincidencia | [CP009.yaml](flows/CP009.yaml) | Orden, tiempos e historial persistido |
| CP010 | Informar cuando no hay viviendas dentro del presupuesto | [CP010.yaml](flows/CP010.yaml) | Resultado vacío y mínimo disponible |
| CP011 | Mostrar la ficha completa de una vivienda | [CP011.yaml](flows/CP011.yaml) | Aserciones UI y captura |
| CP012 | Mostrar el tiempo de viaje al trabajo en el detalle | [CP012.yaml](flows/CP012.yaml) | Petición real de ruta |
| CP013 | Mostrar los pines del trabajo y de las viviendas en el mapa | [CP013.yaml](flows/CP013.yaml) | Detección visual de pines en la captura original |
| CP014 | Mostrar la tarjeta informativa al tocar un pin de vivienda | [map-ready.yaml](flows/common/map-ready.yaml) + [CP014.yaml](flows/CP014.yaml) | Toque del pin detectado, cambio de precio, foto y características |
| CP015 | Dibujar la ruta de la vivienda al trabajo | [map-ready.yaml](flows/common/map-ready.yaml) + [CP015.yaml](flows/CP015.yaml) | Toque del pin detectado en Android/iOS; geometría vial, extremos y línea renderizada |
| CP016 | Mostrar las variables que influyen en la recomendación | [CP016.yaml](flows/CP016.yaml) | Aserciones UI y captura |
| CP017 | Agregar una vivienda a favoritos | [CP017.yaml](flows/CP017.yaml) | Favorito persistido |
| CP018 | Recalcular los tiempos al cambiar el modo de transporte | [CP018.yaml](flows/CP018.yaml) | Modo persistido y tiempos diferentes |
| CP019 | Iniciar el formulario de publicación de un anuncio | [CP019.yaml](flows/CP019.yaml) | Aserciones UI y captura |
| CP020 | Guardar automáticamente el borrador al salir del formulario | [CP020.yaml](flows/CP020.yaml) | Aserciones UI y captura |
| CP021 | Ubicar la vivienda con un pin en el mapa | [CP021.yaml](flows/CP021.yaml) | Aserciones UI y captura |
| CP022 | Guardar las coordenadas y avanzar al paso 2 | [CP022.yaml](flows/CP022.yaml) | Aserciones UI y captura |
| CP023 | Bloquear el avance si faltan datos clave en el paso 2 | [CP023.yaml](flows/CP023.yaml) | Aserciones UI y captura |
| CP024 | Advertir al superar el límite de 5 fotos | [CP024.yaml](flows/CP024.yaml) | Aserciones UI y captura |
| CP025 | Guardar las áreas comunes y servicios elegidos | [CP025.yaml](flows/CP025.yaml) | Amenidades, imágenes y estado persistidos |
| CP026 | Dejar el anuncio en estado Pendiente al finalizar | [CP026.yaml](flows/CP026.yaml) | Publicación pendiente e imágenes persistidas |
| CP027 | Bloquear la edición de un anuncio pendiente | [CP027.yaml](flows/CP027.yaml) | Datos sin cambios |
| CP028 | Listar todas las propiedades del propietario | [CP028.yaml](flows/CP028.yaml) | Lista completa comparada con las propiedades del dueño en BD |
| CP029 | Filtrar las publicaciones por estado | [CP029.yaml](flows/CP029.yaml) | Aserciones UI y captura |
| CP030 | Listar las propiedades pendientes en el panel del administrador | [CP030.yaml](flows/CP030.yaml) | Lista completa de pendientes comparada con BD |
| CP031 | Mostrar los botones de moderación en cada tarjeta | [CP031.yaml](flows/CP031.yaml) | Aserciones UI y captura |
| CP032 | Aprobar una publicación y verla en el catálogo | [CP032.yaml](flows/CP032.yaml) | Estado aprobado persistido y catálogo con otro usuario |
| CP033 | Rechazar una publicación con motivo | [CP033.yaml](flows/CP033.yaml) | Rechazo y motivo persistidos; catálogo completo con otro usuario |
| CP034 | Mostrar el listado de usuarios registrados | [CP034.yaml](flows/CP034.yaml) | Lista completa recibida comparada con los usuarios en BD |
| CP035 | Buscar un usuario por correo | [CP035.yaml](flows/CP035.yaml) | Petición filtrada y respuesta con un único correo esperado |
| CP036 | Bloquear una cuenta y desactivar sus propiedades | [CP036.yaml](flows/CP036.yaml) | Cuenta bloqueada, propiedades ocultas y catálogo completo con otro usuario |
| CP037 | Denegar el inicio de sesión a una cuenta bloqueada | [CP037.yaml](flows/CP037.yaml) | Aserciones UI y captura |
| CP038 | Iniciar sesión con credenciales correctas | [CP038.yaml](flows/CP038.yaml) | Aserciones UI y captura |
| CP039 | Rechazar credenciales incorrectas | [CP039.yaml](flows/CP039.yaml) | Aserciones UI y captura |
| CP040 | Cerrar la sesión del usuario | [CP040.yaml](flows/CP040.yaml) | Aserciones UI y captura |
| CP041 | Recordar la sesión al reabrir la app | [CP041.yaml](flows/CP041.yaml) | Aserciones UI y captura |
| CP042 | Mostrar los tiempos por franja horaria en modo auto | [CP042.yaml](flows/CP042.yaml) | Tres franjas reales en la respuesta de ruta |
| CP043 | Contactar al anunciante por WhatsApp | [CP043.yaml](flows/CP043.yaml) | WhatsApp instalado y con sesión activa; bloqueado si falta |
| CP044 | Editar una publicación aprobada y enviarla a nueva revisión | [CP044.yaml](flows/CP044.yaml) | Precio editado y estado pendiente |
| CP045 | Corregir una publicación rechazada y reenviarla | [CP045.yaml](flows/CP045.yaml) | Precio corregido y estado pendiente |

## Reglas de evaluación

- `catalog.json` conserva los pasos y resultados esperados de los 44 casos activos en `cases`. CP005 permanece únicamente en `excluded_cases` como referencia histórica, con el SHA256 de la versión anterior del documento de origen.
- Un caso falla si falla una aserción UI o su postcondición en BD/HTTP.
- CP005 no tiene ejecutor en esta suite. Los scripts de preparación, datos y verificación son soporte para acciones de la app, no pruebas independientes de procesos ETL.
- CP030–CP036 se mantienen porque ejercitan las pantallas de administración de la app. CP043 se mantiene por probar el contacto iniciado desde la app; su precondición de WhatsApp sigue registrada como bloqueo.
- CP013 comprueba visualmente los pines. CP014/CP015 localizan el pin en la captura original y `run_suite.py` inyecta un toque físico Android en ese punto; CP015 también detecta la línea renderizada y verifica los extremos de la geometría vial.
- CP043 comprueba la aplicación externa y el mensaje prellenado sin enviarlo. No se sustituye WhatsApp con una aplicación falsa.
- El backend, PostgreSQL, geocodificación, OSRM y el modelo de recomendaciones son reales.
- Solo el transporte de correo y el almacenamiento de imágenes Cloudinary se sustituyen por almacenamiento local en el servidor E2E.
- Una precondición externa faltante se informa como BLOCKED, nunca como PASS.
