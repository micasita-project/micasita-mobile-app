# Revisión de preparación y duración de los 44 CP

Las duraciones de esta tabla corresponden a la validación Android del 5 de noviembre.
Las grabaciones individuales de iOS finalizadas el 6 de noviembre se resumen en
[RESULTS.md](RESULTS.md); su duración de video excluye la preparación inicial y
no equivale al tiempo total de ejecución del CP.

Fecha: 5 de noviembre de 2026. Plataforma comprobada: Android, Pixel 7a (`emulator-5554`).
Backend real y base `micasita_e2e` clonada del seed completo, con fixtures adicionales, imágenes nuevas en disco y OSRM público.

Cada caso mantiene sus precondiciones y limpia el estado de la app. La optimización acorta la navegación de preparación con enlaces reales; el inicio de sesión sigue escribiendo credenciales en pantalla. No se comparte la sesión entre casos.

Resultado consolidado: **43 PASS, 0 FAIL, 1 BLOCKED** (44/44 casos registrados).

CP038 conserva el recorrido desde Perfil para cubrir esa navegación. CP005 permanece fuera del alcance funcional de la app. CP043 se conserva bloqueado por la precondición de WhatsApp acordada.

Los tiempos incluyen preparación de datos, Maestro y verificación posterior. Corresponden a la última ejecución de cada caso, combinando la pasada completa y las repeticiones; no representan una única pasada sin fallos. Los límites de espera son máximos y terminan cuando aparece la condición esperada.

| CP | Comprobación | Preparación revisada | Resultado | Tiempo |
| --- | --- | --- | --- | --- |
| CP001 | Registrar un usuario nuevo con datos válidos | Login directo; conserva registro/OTP, errores o sesión según el caso. | PASS | 63.62 s |
| CP002 | Impedir el registro con un correo ya registrado | Login directo; conserva registro/OTP, errores o sesión según el caso. | PASS | 54.29 s |
| CP003 | Guardar un lugar de trabajo con una dirección válida de Lima | Login real de usuario y Recomendaciones directas; confirma el encabezado. | PASS | 81.96 s |
| CP004 | Rechazar una dirección no seleccionada de la lista o fuera de Lima | Login real de usuario y Recomendaciones directas; confirma el encabezado. | PASS | 102.78 s |
| CP006 | Mostrar el catálogo de 10 en 10 con carga al desplazarse | Catálogo directo con estado limpio; conserva las acciones del caso. | PASS | 28.48 s |
| CP007 | Mostrar solo las viviendas aprobadas | Catálogo directo con estado limpio; conserva las acciones del caso. | PASS | 21.37 s |
| CP008 | Filtrar viviendas por rango de precio | Catálogo directo con estado limpio; conserva las acciones del caso. | PASS | 34.90 s |
| CP009 | Mostrar las recomendaciones ordenadas por puntaje de coincidencia | Login real de usuario y Recomendaciones directas; confirma el encabezado. | PASS | 43.29 s |
| CP010 | Informar cuando no hay viviendas dentro del presupuesto | Login real de usuario y Recomendaciones directas; confirma el encabezado. | PASS | 36.26 s |
| CP011 | Mostrar la ficha completa de una vivienda | Catálogo directo con estado limpio; conserva las acciones del caso. | PASS | 31.53 s |
| CP012 | Mostrar el tiempo de viaje al trabajo en el detalle | Login real de usuario; conserva mapa, favoritos o detalle según el caso. | PASS | 55.01 s |
| CP013 | Mostrar los pines del trabajo y de las viviendas en el mapa | Login real de usuario; conserva mapa, favoritos o detalle según el caso. | PASS | 34.08 s |
| CP014 | Mostrar la tarjeta informativa al tocar un pin de vivienda | Login real de usuario; conserva mapa, favoritos o detalle según el caso. | PASS | 39.79 s |
| CP015 | Dibujar la ruta de la vivienda al trabajo | Login real de usuario; conserva mapa, favoritos o detalle según el caso. | PASS | 46.13 s |
| CP016 | Mostrar las variables que influyen en la recomendación | Login real de usuario y Recomendaciones directas; confirma el encabezado. | PASS | 49.85 s |
| CP017 | Agregar una vivienda a favoritos | Login real de usuario; conserva mapa, favoritos o detalle según el caso. | PASS | 73.72 s |
| CP018 | Recalcular los tiempos al cambiar el modo de transporte | Login real de usuario y Recomendaciones directas; confirma el encabezado. | PASS | 58.63 s |
| CP019 | Iniciar el formulario de publicación de un anuncio | Login real de propietario y catálogo directo; conserva formulario y edición. | PASS | 50.19 s |
| CP020 | Guardar automáticamente el borrador al salir del formulario | Login real de propietario y catálogo directo; conserva formulario y edición. | PASS | 77.64 s |
| CP021 | Ubicar la vivienda con un pin en el mapa | Login real de propietario y catálogo directo; conserva formulario y edición. | PASS | 57.03 s |
| CP022 | Guardar las coordenadas y avanzar al paso 2 | Login real de propietario y catálogo directo; conserva formulario y edición. | PASS | 53.95 s |
| CP023 | Bloquear el avance si faltan datos clave en el paso 2 | Login real de propietario y catálogo directo; conserva formulario y edición. | PASS | 57.82 s |
| CP024 | Advertir al superar el límite de 5 fotos | Login real de propietario y catálogo directo; conserva formulario y edición. | PASS | 108.29 s |
| CP025 | Guardar las áreas comunes y servicios elegidos | Login real de propietario y catálogo directo; conserva formulario y edición. | PASS | 118.09 s |
| CP026 | Dejar el anuncio en estado Pendiente al finalizar | Login real de propietario y catálogo directo; conserva formulario y edición. | PASS | 106.43 s |
| CP027 | Bloquear la edición de un anuncio pendiente | Login real de propietario y catálogo directo; conserva formulario y edición. | PASS | 42.35 s |
| CP028 | Listar todas las propiedades del propietario | Login real de propietario y catálogo directo; conserva formulario y edición. | PASS | 41.08 s |
| CP029 | Filtrar las publicaciones por estado | Login real de propietario y catálogo directo; conserva formulario y edición. | PASS | 46.29 s |
| CP030 | Listar las propiedades pendientes en el panel del administrador | Login real de administrador; conserva moderación y comprobaciones posteriores. | PASS | 36.37 s |
| CP031 | Mostrar los botones de moderación en cada tarjeta | Login real de administrador; conserva moderación y comprobaciones posteriores. | PASS | 31.37 s |
| CP032 | Aprobar una publicación y verla en el catálogo | Login real de administrador; conserva moderación y comprobaciones posteriores. | PASS | 88.55 s |
| CP033 | Rechazar una publicación con motivo | Login real de administrador; conserva moderación y comprobaciones posteriores. | PASS | 114.95 s |
| CP034 | Mostrar el listado de usuarios registrados | Login real de administrador; conserva moderación y comprobaciones posteriores. | PASS | 37.01 s |
| CP035 | Buscar un usuario por correo | Login real de administrador; conserva moderación y comprobaciones posteriores. | PASS | 43.42 s |
| CP036 | Bloquear una cuenta y desactivar sus propiedades | Login real de administrador; conserva moderación y comprobaciones posteriores. | PASS | 109.92 s |
| CP037 | Denegar el inicio de sesión a una cuenta bloqueada | Login directo; conserva registro/OTP, errores o sesión según el caso. | PASS | 34.89 s |
| CP038 | Iniciar sesión con credenciales correctas | Recorrido completo desde Perfil; cubre el acceso normal al login. | PASS | 40.02 s |
| CP039 | Rechazar credenciales incorrectas | Login directo; conserva registro/OTP, errores o sesión según el caso. | PASS | 48.95 s |
| CP040 | Cerrar la sesión del usuario | Login directo; conserva registro/OTP, errores o sesión según el caso. | PASS | 48.98 s |
| CP041 | Recordar la sesión al reabrir la app | Login directo; conserva registro/OTP, errores o sesión según el caso. | PASS | 38.82 s |
| CP042 | Mostrar los tiempos por franja horaria en modo auto | Login real de usuario y Recomendaciones directas; confirma el encabezado. | PASS | 48.88 s |
| CP043 | Contactar al anunciante por WhatsApp | Catálogo directo con estado limpio; conserva las acciones del caso. | BLOCKED | 0.00 s |
| CP044 | Editar una publicación aprobada y enviarla a nueva revisión | Login real de propietario y catálogo directo; conserva formulario y edición. | PASS | 60.00 s |
| CP045 | Corregir una publicación rechazada y reenviarla | Login real de propietario y catálogo directo; conserva formulario y edición. | PASS | 67.54 s |

## Ajustes y límites de la comparación

- CP006 conserva la comprobación de 10 a 20 elementos y las dos respuestas reales de paginación. Sus dos grabaciones medidas pasaron de 61,6 a 24,3 segundos, incluida la preparación, sin edición del video. Esta comparación no permite atribuir el mismo porcentaje de mejora al resto de casos.
- La escritura de direcciones verifica el contenido completo y permite reescribirlo si Android perdió caracteres. Se separa el primer carácter para esperar la actualización del campo controlado antes de continuar.
- La navegación a Recomendaciones comprueba su encabezado antes de buscar tarjetas; evita desplazarse durante 45 segundos en otra pantalla.
- Publicar y Aplicar filtros comprueban el cambio de pantalla con reintentos limitados. Se cierra el aviso de LogBox del build de desarrollo mediante su botón cuando está presente, conservando los mensajes en los logs.
- Fotos, geocodificación, rutas, registro, moderación y formularios de varios pasos mantienen sus acciones reales. Su duración no equivale a la de un caso de desplazamiento simple.
- Los cambios compartidos tienen ramas para iOS, pero esta revisión se ejecutó en Android. Los resultados históricos iOS no validan automáticamente estos cambios.

Validación unitaria tras desactivar autocorrección y revisión ortográfica en la búsqueda de direcciones: 90 suites y 1502 pruebas aprobadas. Las evidencias de ejecución se generan en `e2e/results/`, excluido de Git. Consultar [RESULTS.md](RESULTS.md) y [README.md](README.md).
