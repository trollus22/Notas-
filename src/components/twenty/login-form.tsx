import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { useColors } from '@/hooks/use-colors';
import { useTwentySession } from './twenty-session-context';

// Acceso con la cuenta de Twenty. La contraseña no se guarda: solo el token de sesión.
export function LoginForm() {
  const colors = useColors();
  const { signIn } = useTwentySession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ready = !busy && email.trim() !== '' && password !== '';

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await signIn(email.trim(), password);
      setPassword('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo iniciar sesión.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.form}>
      <Text style={[styles.lead, { color: colors.text }]}>Entra con tu cuenta de Twenty.</Text>
      <TextInput
        value={email}
        onChangeText={setEmail}
        placeholder="Correo electrónico"
        placeholderTextColor={colors.textTertiary}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
      />
      <TextInput
        value={password}
        onChangeText={setPassword}
        placeholder="Contraseña"
        placeholderTextColor={colors.textTertiary}
        secureTextEntry
        autoComplete="password"
        onSubmitEditing={submit}
        style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
      />
      {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}
      <Pressable accessibilityRole="button" onPress={submit} disabled={!ready} style={[styles.button, { backgroundColor: colors.accent, opacity: ready ? 1 : 0.5 }]}>
        {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Entrar</Text>}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  form: { paddingHorizontal: 20, paddingTop: 24, gap: 12 },
  lead: { fontSize: 15, lineHeight: 21 },
  input: { height: 46, borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, paddingHorizontal: 14, fontSize: 16 },
  button: { height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  error: { fontSize: 14, lineHeight: 19 },
});
