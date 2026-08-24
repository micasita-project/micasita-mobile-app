# MiCasita — Arquitectura Frontend: Estado Actual

> Documento de referencia para actualizar los diagramas C4 del proyecto.
> Cubre únicamente los cambios en el **frontend (Mobile App)**; el backend se describe
> sólo cuando cambia su interfaz pública visible desde el cliente.

---

## Qué cambió respecto a los diagramas originales

### Nivel Context

| Cambio | Detalle |
|--------|---------|
| Nuevo actor | **Usuario Invitado** — puede explorar viviendas y obtener recomendaciones IA sin registrarse. |
| Ruteo centralizado en el backend | El cliente **ya no llama a OSRM directamente**. Todo el enrutamiento (tiempo y geometría) pasa por `GET /route` en la API — ver más abajo. |

El motor de enrutamiento es OSRM, propio y autohospedado (grafo recortado a Lima
Metropolitana), pero vive enteramente detrás de la API: el cliente solo conoce
`GET /route`, nunca la URL de OSRM ni sus credenciales.

---

### Nivel Container

| Cambio | Detalle |
|--------|---------|
| Mobile App incluye almacenamiento local | **AsyncStorage** persiste los datos de invitado (vivienda actual, workplace, últimas recomendaciones) dentro del propio contenedor de la app; no es un sistema externo. |
| Nuevo endpoint sin auth | `POST /recommend/guest` en la API Application acepta peticiones sin JWT. La Mobile App lo llama directamente para usuarios invitados. |
| Ruteo vía `GET /route` | La Mobile App ya no consulta OSRM directamente. `entities/route/api/location.service.ts` llama a `GET /route` en la API, que resuelve tiempo (corregido por el mismo modelo que usa la recomendación) y geometría. Si la API falla, degrada a una aproximación por Haversine en el propio cliente. |
| Auth es opcional | El apiClient de la Mobile App inyecta JWT sólo si existe; si no, las llamadas a `/recommend/guest` se envían sin cabecera Authorization. |
| Nuevos endpoints de auth | La API expone `POST /auth/verify-email`, `/auth/resend-verification`, `/auth/forgot-password`, `/auth/reset-password` y `/auth/me/change-password`, consumidos por las nuevas pantallas de verificación, recuperación y cambio de contraseña. Los OTP se envían por correo (SendGrid, gestionado por el backend). |

---

### Nivel Components (Frontend)

Esta es la capa más afectada. La Mobile App sigue **Feature-Sliced Design (FSD)**
con las siguientes capas: `app → widgets → features → entities → shared`.

#### Nuevos componentes

| Componente | Capa | Rol |
|------------|------|-----|
| `features/guest` | feature | Contexto y UI para modo invitado (ver abajo). |
| `shared/ui/BottomSheet` | shared | Sheet animado genérico reutilizable con swipe-to-dismiss. |
| `shared/ui/map/*` | shared | Primitivas de mapa por plataforma (`AppMapView`, `AppMarker`, `AppCircle`, `AppPolyline`, `AppUrlTile`) con variantes `.ios.tsx` / `.android.tsx`. Reemplazan al antiguo `widgets/map-board`. |
| `shared/ui/OtpInput` | shared | Input de OTP con casillas separadas: auto-avance al escribir, retroceso con backspace y pegado del código completo distribuido. |
| `features/auth/ui/VerifyEmailForm` | feature | Verificación de correo por OTP tras el registro (con reenvío de código). |
| `features/auth/ui/ForgotPasswordForm` | feature | Recuperación de contraseña en 2 pasos (email → OTP + nueva contraseña). |
| `app/verify-email` | app | Pantalla de verificación de correo. |
| `app/forgot-password` | app | Pantalla "¿Olvidaste tu contraseña?". |
| `app/edit-profile` | app | Página de edición de cuenta (datos personales + cambio de contraseña). Reemplaza el BottomSheet de editar perfil. |

#### Componentes modificados significativamente

| Componente | Capa | Qué cambió |
|------------|------|------------|
| `features/auth / AuthContext` | feature | Al registrar, transfiere home + workplace del invitado a la cuenta nueva **antes** de llamar `setUser()` para evitar race condition con el guard de routing. Al hacer login, limpia los datos de invitado. **Flujo OTP:** el registro ya **no auto-loguea** (espera verificación de correo) y el login detecta cuentas sin verificar para redirigir a `/verify-email`. Nuevos: `completePendingVerification`, `resendVerification`, `pendingEmail`. |
| `features/auth/api/auth.service` | feature | Nuevos servicios: `verifyEmail`, `resendVerification`, `forgotPassword`, `resetPassword` y `changePassword` (cambio de contraseña con sesión activa). |
| `features/auth/ui/LoginForm` | feature | Link "¿Olvidaste tu contraseña?" y navegación a `/verify-email` tras registrar o al detectar cuenta sin verificar. |
| `features/recommendation` | feature | Timeout extendido a 60 s. Nuevos campos: `max_distance_km`, `limit`, `home_lat`, `home_lon` en request; `time_saved_mins` en response. Nuevo hook `useGuestRecommendations` (mutation manual). |
| `widgets/map-board` → `app/(tabs)/index` | app / shared | **Refactor:** el `MapBoardWidget` se eliminó; el mapa pasó a ser la propia página `app/(tabs)/index.tsx`, apoyada en las primitivas `shared/ui/map`. Sigue soportando invitados (markers de casa/trabajo, `Circle` de radio, recomendaciones desde `GuestContext`). |
| `app/_layout` | app | Eliminado el redirect global a `/login`. Los invitados acceden a `/(tabs)` sin autenticación. `GuestProvider` envuelve toda la app. Registradas las rutas `verify-email`, `forgot-password` y `edit-profile`. |
| `app/(tabs)/recommend` | app | Flujo dual: autenticados usan `latest/generate`; invitados usan datos de `GuestContext` + botón de actualizar bajo demanda. Muestra `time_saved_mins` en cada tarjeta. Mensaje *inline* cuando una búsqueda de invitado no arroja resultados. |
| `app/(tabs)/profile` | app | Para invitados muestra CTA de login/registro con lista de beneficios. El lápiz de "Editar perfil" ahora **navega a la página `app/edit-profile`** (antes era un BottomSheet). |
| `app/(tabs)/housing` | app | Añade estados de carga/error. FAB "Publicar" redirige invitados al login. Oculta "Mis publicaciones" para invitados. |
| `app/login` | app | Muestra botón "← Volver" sólo cuando hay historial de navegación. |
| `app/housing-detail` | app | Recibe el objeto `Housing` completo serializado como param `data` en lugar de sólo el `id`, evitando buscar en el JSON local IDs que vienen del backend. Si llega desde una recomendación, también recibe `reco` (tiempo/ahorro ya corregidos) y no vuelve a pedir nada; si no, pide `GET /route` una sola vez, en el modo de transporte preferido — nunca los 3 modos. Ajuste de offset del safe-area en Android. |
| `app/(tabs)/index` (mapa) | app | El modo de transporte ya no es un chip editable: sale de las preferencias del workplace activo. Seleccionar una vivienda pide `GET /route` una sola vez (antes: hasta 6 llamadas, 3 modos × 2 orígenes) solo para la geometría del polyline — tiempo y ahorro salen de la recomendación ya calculada. Viviendas con coordenada exactamente coincidente (geocoding sin número de puerta) se reparten en un pequeño círculo (`spreadOverlappingMarkers`) para que cada marcador sea seleccionable por separado. |
| `entities/route` | entity | `fetchModeRoute` ya no llama a OSRM: llama a `GET /route`. `useRouteCalculation` descarta respuestas de ruta obsoletas con un contador de petición, para que seleccionar una vivienda nueva antes de que resuelva la anterior no deje el polyline pegado a la selección previa. |

---

## Detalle: `features/guest`

```
features/guest/
  model/
    GuestContext.tsx     — Provider + useGuest()
                           Estado: guestHome, guestWorkplace, guestRecommendations
                           Persistencia: AsyncStorage (3 claves)
                           Métodos: setGuestHome, setGuestWorkplace,
                                    updateGuestRadius, saveGuestRecommendations,
                                    clearGuestData
  ui/
    GuestSetupModal.tsx  — BottomSheet de 2 pasos:
                           Paso 1: dirección de casa (búsqueda texto + mapa)
                           Paso 2: workplace + presupuesto + transporte + slider de radio
                           Al guardar → llama POST /recommend/guest → persiste resultados
  index.ts
```

### Flujo de datos invitado

```
AsyncStorage (persistido)
    │
    ▼
GuestContext (estado React)
    ├── Map screen (app/(tabs)/index) ← lee recomendaciones almacenadas, muestra Circle
    └── RecommendScreen               ← muestra recomendaciones, botón "Actualizar" (re-llama API)

GuestSetupModal
    ├── Geocode (Nominatim/OSM) — búsqueda de direcciones
    ├── OSRM tiles (MapView)    — selección en mapa
    └── POST /recommend/guest   — genera recomendaciones al guardar
```

---

## Detalle: flujo de autenticación con OTP

```
features/auth/
  api/auth.service.ts   — registerUser, loginUser, getMe, updateHome, updateProfile
                          + verifyEmail, resendVerification, forgotPassword,
                            resetPassword, changePassword
  model/AuthContext.tsx — login / register / logout / setHome / refreshUser
                          + pendingEmail, completePendingVerification, resendVerification
  ui/
    LoginForm.tsx          — login/registro + "¿Olvidaste tu contraseña?"
    VerifyEmailForm.tsx    — OtpInput (6 casillas) + reenvío con cooldown
    ForgotPasswordForm.tsx — paso 1: email → paso 2: OtpInput + nueva contraseña
```

### Flujos cubiertos

```
Registro
  registerUser → (cuenta sin verificar) → /verify-email
    └─ VerifyEmailForm → completePendingVerification(otp)
         → verifyEmail + loginUser + transferir datos de invitado → setUser

Login con correo sin verificar
  loginUser → 403 "verifica tu correo" → /verify-email

Recuperar contraseña (sin sesión, desde el login)
  ForgotPasswordForm → forgotPassword(email) → OTP
                     → resetPassword(email, otp, nueva) → /login

Cambiar contraseña (con sesión activa, desde el perfil)
  app/edit-profile → changePassword(actual, nueva)
```

> El OTP se ingresa con el componente `shared/ui/OtpInput`: una casilla por dígito, salto automático a la siguiente, y al pegar el código completo se distribuye entre todas las casillas.

---

## Diagramas C4 actualizados (sólo secciones cambiadas)

### Context — PlantUML actualizado

```plantuml
@startuml
!include https://raw.githubusercontent.com/plantuml-stdlib/C4-PlantUML/master/C4_Context.puml

LAYOUT_WITH_LEGEND()

Person(user, "Usuario Final", "Busca viviendas y evalúa rutas óptimas hacia su trabajo.")
Person(guest, "Usuario Invitado", "Explora viviendas y obtiene recomendaciones sin registrarse.")
Person(admin, "Administrador", "Modera y gestiona el inventario de propiedades.")

System_Boundary(c1, "Sistema MiCasita") {
    System(micasita, "Plataforma MiCasita", "Permite la búsqueda inteligente de viviendas basada en tiempos de trayecto y scoring IA (XGBoost).")
}

System_Ext(osm, "OpenStreetMap", "Provee tiles de mapas para la visualización.")
System_Ext(osrm, "OSRM", "Calcula rutas, tiempos y distancias (Driving, Cycling, Walking).")
System_Ext(cloudinary, "Cloudinary", "Almacenamiento y gestión de imágenes de propiedades.")

Rel(user, micasita, "Busca viviendas y calcula rutas", "HTTPS/Mobile App")
Rel(guest, micasita, "Explora viviendas sin cuenta", "HTTPS/Mobile App")
Rel(admin, micasita, "Modera propiedades (panel admin)", "HTTPS/Mobile App")

Rel(micasita, osm, "Consulta tiles de mapa", "HTTPS/GET")
Rel(micasita, osrm, "Solicita trazado de rutas y tiempos", "HTTPS/GET")
Rel(micasita, cloudinary, "Carga y descarga imágenes", "HTTPS/API")

@enduml
```

---

### Containers — PlantUML actualizado

```plantuml
@startuml
!include https://raw.githubusercontent.com/plantuml-stdlib/C4-PlantUML/master/C4_Container.puml

LAYOUT_WITH_LEGEND()

Person(user, "Usuario Final", "Inquilino o comprador.")
Person(guest, "Usuario Invitado", "Sin cuenta registrada.")
Person(admin, "Administrador", "Gestor de propiedades.")

System_Boundary(micasita_system, "Sistema MiCasita") {
    Container(mobile_app, "Mobile App", "React Native, Expo, TypeScript", "Interfaz móvil para búsqueda, recomendaciones IA y visualización de rutas.\nIncluye AsyncStorage para persistir datos de invitado localmente.\nNunca llama a OSRM directamente.")
    Container(api_app, "API Application", "Python, FastAPI", "Gestiona lógica de negocio, autenticación JWT, ruteo OSRM centralizado y corrección de tiempo con XGBoost.")
    ContainerDb(db, "Database", "PostgreSQL", "Almacena usuarios, propiedades y lugares de trabajo.")
}

System_Ext(osm, "OpenStreetMap", "Map Tiles Provider")
System_Ext(osrm, "OSRM Engine", "Routing Engine propio, grafo recortado a Lima — llamado solo por la API")
System_Ext(cloudinary, "Cloudinary", "Image Storage")

Rel(user, mobile_app, "Interactúa con", "UI")
Rel(guest, mobile_app, "Explora sin cuenta", "UI")
Rel(admin, mobile_app, "Modera propiedades (panel /(admin))", "UI")

Rel(mobile_app, api_app, "Consulta recomendaciones, rutas (GET /route) y autentica\n(JWT opcional — /recommend/guest sin auth)", "HTTPS/JSON")
Rel(mobile_app, osm, "Descarga tiles del mapa", "HTTPS")

Rel(api_app, db, "Lee/Escribe datos", "SQLAlchemy ORM")
Rel(api_app, osrm, "Batch + bajo demanda: tiempo corregido y geometría", "HTTPS")
Rel(api_app, cloudinary, "Sube fotos de viviendas", "HTTPS API")

@enduml
```

---

### Components — PlantUML actualizado (frontend)

```plantuml
@startuml
!include https://raw.githubusercontent.com/plantuml-stdlib/C4-PlantUML/master/C4_Component.puml

HIDE_STEREOTYPE()
skinparam linetype ortho
skinparam wrapWidth 150
skinparam nodesep 22
skinparam ranksep 50

System_Ext(osrm, "OSRM Engine", "Rutas multi-modal")
System_Ext(osm, "OpenStreetMap", "Tiles de mapa")
Container(api, "API Application", "FastAPI", "Backend principal")

Container_Boundary(mobile_app, "Aplicación Móvil MiCasita (FSD)") {

    Boundary(app_l, "App (Expo Router)") {
        Component(pages, "Pages / Navegación", "Expo Router", "Pantallas y dual-routing (auth/invitado); mapa; panel admin; OTP y perfil")
    }

    Boundary(widget_l, "Widgets") {
        Component(location_picker, "Location Picker", "MapPickerModal", "Ubicación por texto o mapa")
        Component(workplace_sheet, "Workplace Sheet", "BottomSheet", "Selector de workplace")
    }

    Boundary(feat_l, "Features") {
        Component(auth_feat, "Auth", "React Context", "Sesión JWT; registro+OTP; login; recuperar/cambiar contraseña")
        Component(guest_feat, "Guest", "AsyncStorage", "Perfil invitado")
        Component(recommend_feat, "Recommendation", "React Query", "Recomendaciones IA")
        Component(route_feat, "Route Calc.", "Custom Hook", "Compara tiempos multi-modal")
        Component(publish_feat, "Publish Housing", "Form Wizard", "Wizard de publicación")
        Component(admin_feat, "Admin", "Components + API", "Moderación (rol admin)")
    }

    Boundary(ent_l, "Entities") {
        Component(housing_ent, "Housing", "Axios + RQ", "CRUD propiedades + favoritos")
        Component(workplace_ent, "Workplace", "Axios + RQ", "CRUD workplaces")
        Component(recpref_ent, "RecPreferences", "Axios + RQ", "Preferencias por workplace")
        Component(route_ent, "Route", "Fetch + caché", "Rutas vía GET /route de la API; fallback Haversine si falla")
    }

    Boundary(shared_l, "Shared") {
        Component(shared_api, "API Client", "Axios", "HTTP central; inyecta JWT")
        Component(geocode_svc, "Geocode Service", "Axios", "Proxy /geocode")
        Component(map_ui, "Map Primitives", "react-native-maps", "Mapa por plataforma (.ios/.android)")
        Component(otp_input, "OtpInput", "React Native", "Casillas OTP (auto-avance + pegado)")
    }
}

' ── App → widgets / features / mapa ───────────────────────────────
Rel(pages, map_ui, "Mapa")
Rel(pages, auth_feat, "Sesión")
Rel(pages, guest_feat, "Invitado")
Rel(pages, recommend_feat, "Recomendaciones")
Rel(pages, housing_ent, "Feed / favoritos")
Rel(pages, publish_feat, "Publicar")
Rel(pages, admin_feat, "Moderación")
Rel(pages, location_picker, "Ubicación")
Rel(pages, workplace_sheet, "Workplace")

' ── Entre componentes ─────────────────────────────────────────────
Rel(auth_feat, otp_input, "OTP")
Rel(auth_feat, guest_feat, "Transfiere invitado")
Rel(guest_feat, recommend_feat, "/recommend/guest")
Rel(location_picker, geocode_svc, "Geocode")
Rel(route_feat, route_ent, "Rutas")

' ── Capa de datos → API Client ────────────────────────────────────
Rel(housing_ent, shared_api, "REST")
Rel(workplace_ent, shared_api, "REST")
Rel(recpref_ent, shared_api, "REST")
Rel(auth_feat, shared_api, "/auth/*")
Rel(recommend_feat, shared_api, "/recommend/*")
Rel(publish_feat, shared_api, "/properties/ + upload")
Rel(admin_feat, shared_api, "/admin/*")
Rel(geocode_svc, shared_api, "/geocode/*")

' ── Externos ──────────────────────────────────────────────────────
Rel(route_ent, shared_api, "GET /route")
Rel(map_ui, osm, "Tiles", "HTTPS")
Rel(shared_api, api, "REST", "HTTPS/JSON")
Rel(api, osrm, "Ruteo centralizado", "HTTPS")

@enduml
```
