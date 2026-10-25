import { useEffect, type ReactNode } from 'react';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useColors } from '@/hooks/use-colors';
import { fetchTwentyData } from '@/lib/twenty';
import { buildWorkspace, IMPORTED_OBJECTS } from '@/lib/twenty-import';
import { useWorkspace } from '@/store/workspace-context';
import { LoginForm } from './login-form';
import { isUnauthorized, useTwentySession } from './twenty-session-context';

// Sin sesión de Twenty se pide la cuenta. Con sesión, el contenido de la app se rellena con los datos de Twenty
// (se queda guardado en el dispositivo y se vuelve a traer al abrir la app).
export function TwentyGate({ children }: { children: ReactNode }) {
  const colors = useColors();
  const workspace = useWorkspace();
  const { token, expire } = useTwentySession();

  useEffect(() => {
    if (!token) return;
    fetchTwentyData(token, IMPORTED_OBJECTS.map((o) => o.plural))
      .then((data) => workspace.replaceAll(buildWorkspace(data)))
      .catch(async (e: unknown) => {
        if (isUnauthorized(e)) await expire();
        else console.warn('No se pudo traer Twenty', e);
      });
  }, [token, workspace, expire]);

  if (token === undefined) return null;
  if (token === null) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.sidebar }}>
        <ScrollView keyboardShouldPersistTaps="handled">
          <LoginForm />
        </ScrollView>
      </SafeAreaView>
    );
  }
  return children;
}
