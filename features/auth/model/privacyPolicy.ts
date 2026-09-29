/**
 * @layer features/auth/model
 * @description Texto de la Política de Privacidad. La versión debe coincidir con
 * PRIVACY_POLICY_VERSION del backend.
 */

export const PRIVACY_POLICY_VERSION = '1.0';
export const PRIVACY_POLICY_DATE = '28/09/2026';

export interface PolicySection {
  title: string;
  paragraphs: string[];
}

export const PRIVACY_POLICY_SECTIONS: PolicySection[] = [
  {
    title: '1. Quién trata tus datos',
    paragraphs: [
      'MiCasita es un proyecto académico de la Universidad Peruana de Ciencias Aplicadas (UPC). El equipo del proyecto es responsable del tratamiento de los datos que ingresas en la aplicación, conforme a la Ley N.° 29733, Ley de Protección de Datos Personales.',
    ],
  },
  {
    title: '2. Qué datos recopilamos',
    paragraphs: [
      'Correo electrónico y contraseña (la contraseña se guarda cifrada). Nombre y apellido, que son opcionales.',
      'La ubicación de tu vivienda actual y de tus lugares de trabajo, tu presupuesto, tu modo de transporte y el radio de búsqueda.',
      'Tu historial de recomendaciones, tus viviendas favoritas y las viviendas que publiques, incluido el teléfono de contacto que ingreses en ellas.',
    ],
  },
  {
    title: '3. Para qué los usamos',
    paragraphs: [
      'Calcular el tiempo de trayecto entre las viviendas y tu trabajo y recomendarte viviendas. Verificar tu correo y recuperar tu contraseña. Revisar las publicaciones antes de mostrarlas.',
    ],
  },
  {
    title: '4. Modo invitado',
    paragraphs: [
      'Si usas la aplicación sin cuenta, tus datos se guardan solo en tu dispositivo. Se envían al servidor únicamente para calcular la recomendación y el servidor no los conserva.',
    ],
  },
  {
    title: '5. Con quién los compartimos',
    paragraphs: [
      'No vendemos tus datos. Usamos estos proveedores: Render (alojamiento del servidor y la base de datos), Cloudinary (fotos de las viviendas) y SendGrid (envío de correos), los tres con servidores en Estados Unidos. Para buscar direcciones usamos los servicios públicos Nominatim y Photon, y para el mapa, OpenStreetMap.',
      'Las rutas se calculan en servidores propios del proyecto, sin enviar tus ubicaciones a un servicio de rutas externo.',
    ],
  },
  {
    title: '6. Cuánto tiempo los conservamos',
    paragraphs: [
      'Mientras tengas una cuenta. Si la eliminas, se borran tu cuenta, tus ubicaciones, preferencias, historial, favoritos y las viviendas que publicaste. Las copias de seguridad pueden conservar los datos durante un tiempo limitado.',
    ],
  },
  {
    title: '7. Tus derechos',
    paragraphs: [
      'Puedes acceder a tus datos y rectificarlos desde tu perfil. Puedes eliminar tu cuenta en Perfil > Editar perfil > Zona de riesgo, y esto también revoca tu consentimiento. Para otras consultas, comunícate con el equipo del proyecto MiCasita.',
    ],
  },
  {
    title: '8. Seguridad',
    paragraphs: [
      'Las contraseñas se guardan cifradas, las comunicaciones con el servidor usan HTTPS y verificamos tu correo con un código de un solo uso.',
    ],
  },
];
