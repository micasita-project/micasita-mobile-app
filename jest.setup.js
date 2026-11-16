// Sustituto oficial de la librería de teclado: no hay módulo nativo en Jest.
jest.mock('react-native-keyboard-controller', () => require('react-native-keyboard-controller/jest'));

// Sustituto oficial de AsyncStorage: no hay módulo nativo en Jest.
jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
