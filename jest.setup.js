// Sustituto oficial de la librería de teclado: no hay módulo nativo en Jest.
jest.mock('react-native-keyboard-controller', () => require('react-native-keyboard-controller/jest'));
