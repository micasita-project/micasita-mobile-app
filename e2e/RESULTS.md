# Resultados E2E de MiCasita en iOS

Fecha: **4 de noviembre de 2026**. Referencia: los 44 casos activos de
[catalog.json](catalog.json), relacionados con sus flujos en [TRACEABILITY.md](TRACEABILITY.md).

| Plataforma | Dispositivo | PASS | FAIL | BLOCKED |
| --- | --- | --- | --- | --- |
| iOS 26.5 | iPhone 17 Pro, Device Hub | 43 | 0 | 1 |

El resultado consolida una pasada completa y las repeticiones de los casos
corregidos. No representa una única pasada continua sin fallos. CP043 quedó
bloqueado porque WhatsApp no estaba instalado y con sesión activa en el simulador,
según lo acordado. Los otros 43 casos aprobaron, incluidos CP024–CP026 con el
selector nativo de Fotos.

Se verificaron las acciones de interfaz y sus postcondiciones en la base aislada
`micasita_e2e` y en el tráfico HTTP real. Se usó OSRM público. Solo el transporte
de correo y el almacenamiento Cloudinary se sustituyeron por servicios locales,
como se detalla en [README.md](README.md).

Durante la ejecución se corrigieron la accesibilidad de los paneles y el diálogo
de rechazo, el cierre del teclado, los selectores de iOS y el encuadre del mapa
para mantener visibles la vivienda y el trabajo. La importación de las fotos de
prueba funcionó al repetirla con la vista del iPhone abierta en Device Hub.

Validaciones adicionales: **90 suites unitarias y 1502 pruebas aprobadas**;
lint con **0 errores y 16 advertencias**.

## Evidencias y reproducción

Las capturas, respuestas HTTP, logs, JUnit e historial detallado se generan en
`e2e/results/`, ignorado por Git. No se incluyen enlaces a esos archivos locales
porque no están disponibles al clonar el repositorio. Este resumen conserva el
resultado registrado; una nueva ejecución genera sus propias evidencias.

La consolidación registrada se identificó como `consolidado-ios-20261104-153533`.
Para preparar el entorno, ejecutar los casos y consolidar sus resultados,
consultar [README.md](README.md).
