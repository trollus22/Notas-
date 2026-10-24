import { Alert, Platform } from 'react-native';

/** Ask before a destructive action. React Native Web has no Alert, so use the browser dialog there. */
export function confirm(title: string, message: string, confirmLabel: string): Promise<boolean> {
  if (Platform.OS === 'web') {
    return Promise.resolve(globalThis.confirm?.(`${title}\n\n${message}`) ?? false);
  }
  return new Promise((resolve) => {
    Alert.alert(
      title,
      message,
      [
        { text: 'Cancelar', style: 'cancel', onPress: () => resolve(false) },
        { text: confirmLabel, style: 'destructive', onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });
}

/** A short message with an OK button. */
export function inform(title: string, message: string): void {
  if (Platform.OS === 'web') {
    globalThis.alert?.(`${title}\n\n${message}`);
    return;
  }
  Alert.alert(title, message);
}

/** For buttons that copy the reference app but need a service that is not connected yet. */
export function notConnectedYet(feature: string): void {
  inform(feature, 'Esta función todavía no está disponible en la app. Funcionará cuando conectemos el servidor.');
}
