import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// Token de Twenty en el llavero del dispositivo (no en localStorage en móvil). En web, sin llavero, se queda en memoria.
const KEY = 'twenty.token';
let memory: string | null = null;

export async function loadToken(): Promise<string | null> {
  if (Platform.OS === 'web') return memory;
  try {
    return await SecureStore.getItemAsync(KEY);
  } catch {
    return null;
  }
}

export async function saveToken(token: string | null): Promise<void> {
  memory = token;
  if (Platform.OS === 'web') return;
  try {
    if (token) await SecureStore.setItemAsync(KEY, token);
    else await SecureStore.deleteItemAsync(KEY);
  } catch {
    // Sin llavero disponible la sesión dura solo hasta cerrar la app.
  }
}
