import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenTitleBar } from '@/components/screen-title-bar';
import { useColors } from '@/hooks/use-colors';
import { preview, listNotes, listTasks, signIn, TwentyError, type TwentyNote, type TwentyTask } from '@/lib/twenty';
import { loadToken, saveToken } from '@/lib/twenty-session';

// Pantalla de Twenty en el móvil. Solo lectura por ahora: notas y tareas de tu espacio.
export default function TwentyScreen() {
  const colors = useColors();
  const [token, setToken] = useState<string | null | undefined>(undefined);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState<TwentyNote[]>([]);
  const [tasks, setTasks] = useState<TwentyTask[]>([]);

  const load = useCallback(async (t: string) => {
    setBusy(true);
    setError(null);
    try {
      const [n, k] = await Promise.all([listNotes(t), listTasks(t)]);
      setNotes(n);
      setTasks(k);
    } catch (e) {
      if (e instanceof TwentyError && e.status === 401) {
        await saveToken(null);
        setToken(null);
      }
      setError(e instanceof Error ? e.message : 'No se pudo leer Twenty.');
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    void loadToken().then((t) => {
      setToken(t);
      if (t) void load(t);
    });
  }, [load]);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const t = await signIn(email.trim(), password);
      await saveToken(t);
      setPassword('');
      setToken(t);
      await load(t);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo iniciar sesión.');
    } finally {
      setBusy(false);
    }
  };

  const signOut = async () => {
    await saveToken(null);
    setToken(null);
    setNotes([]);
    setTasks([]);
  };

  return (
    <SafeAreaView edges={['top']} style={[styles.screen, { backgroundColor: colors.sidebar }]}>
      <ScreenTitleBar title="Twenty" />
      {token === undefined ? (
        <ActivityIndicator style={styles.loader} color={colors.text} />
      ) : token === null ? (
        <View style={styles.form}>
          <Text style={[styles.lead, { color: colors.text }]}>Entra con tu cuenta de Twenty para ver tus notas y tareas.</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="Correo electrónico"
            placeholderTextColor={colors.textTertiary}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            style={[styles.input, { color: colors.text, borderColor: colors.border }]}
          />
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="Contraseña"
            placeholderTextColor={colors.textTertiary}
            secureTextEntry
            autoComplete="password"
            style={[styles.input, { color: colors.text, borderColor: colors.border }]}
            onSubmitEditing={submit}
          />
          {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}
          <Pressable accessibilityRole="button" onPress={submit} disabled={busy || !email || !password} style={[styles.button, { backgroundColor: colors.accent, opacity: busy || !email || !password ? 0.5 : 1 }]}>
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Entrar</Text>}
          </Pressable>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}
          <Section title="Notas" count={notes.length} busy={busy} colors={colors}>
            {notes.map((n) => (
              <Row key={n.id} title={n.title} subtitle={preview(n.text)} colors={colors} />
            ))}
          </Section>
          <Section title="Tareas" count={tasks.length} busy={busy} colors={colors}>
            {tasks.map((t) => (
              <Row key={t.id} title={t.title} subtitle={[t.status, preview(t.text)].filter(Boolean).join(' · ')} colors={colors} />
            ))}
          </Section>
          <Pressable accessibilityRole="button" onPress={signOut} style={styles.signOut}>
            <Text style={[styles.signOutText, { color: colors.danger }]}>Cerrar sesión de Twenty</Text>
          </Pressable>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function Section({ title, count, busy, colors, children }: { title: string; count: number; busy: boolean; colors: ReturnType<typeof useColors>; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>
        {title} · {count}
      </Text>
      <View style={[styles.card, { backgroundColor: colors.background, borderColor: colors.border }]}>
        {busy && count === 0 ? <ActivityIndicator style={styles.loader} color={colors.text} /> : null}
        {!busy && count === 0 ? <Text style={[styles.empty, { color: colors.textTertiary }]}>Nada por aquí.</Text> : null}
        {children}
      </View>
    </View>
  );
}

function Row({ title, subtitle, colors }: { title: string; subtitle: string; colors: ReturnType<typeof useColors> }) {
  return (
    <View style={[styles.row, { borderColor: colors.border }]}>
      <Text numberOfLines={1} style={[styles.rowTitle, { color: colors.text }]}>{title}</Text>
      {subtitle ? <Text numberOfLines={1} style={[styles.rowSub, { color: colors.textTertiary }]}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  loader: { marginVertical: 24 },
  form: { padding: 20, gap: 12 },
  lead: { fontSize: 15, lineHeight: 21, marginBottom: 4 },
  input: { height: 46, borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, paddingHorizontal: 14, fontSize: 16 },
  button: { height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  error: { fontSize: 14, lineHeight: 19 },
  content: { padding: 20, gap: 24 },
  section: { gap: 8 },
  sectionTitle: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4 },
  card: { borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  empty: { padding: 16, fontSize: 14 },
  row: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  rowTitle: { fontSize: 16, fontWeight: '500' },
  rowSub: { fontSize: 13, marginTop: 2 },
  signOut: { alignSelf: 'center', paddingVertical: 8 },
  signOutText: { fontSize: 15 },
});
