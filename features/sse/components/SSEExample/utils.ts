import { Platform } from 'react-native';

/**
 * Retorna a URL padrão baseada na plataforma
 * - Android Emulator: 10.0.2.2 (mapeia para localhost da máquina host)
 * - iOS Simulator: localhost (funciona diretamente)
 * - Dispositivo físico: precisa do IP da máquina na rede local
 */
export function getDefaultSSEUrl(): string {
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:3005/sse';
  } else if (Platform.OS === 'ios') {
    return 'http://localhost:3005/sse';
  }
  return 'http://localhost:3005/sse';
}

export function getBaseUrl(): string {
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:3005';
  } else if (Platform.OS === 'ios') {
    return 'http://localhost:3005';
  }
  return 'http://localhost:3005';
}

