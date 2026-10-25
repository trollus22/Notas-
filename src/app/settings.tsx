import Ionicons from '@expo/vector-icons/Ionicons';
import { useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenTitleBar } from '@/components/screen-title-bar';
import { ActionSheet } from '@/components/sheet';
import { useColors } from '@/hooks/use-colors';
import { confirm } from '@/lib/confirm';
import type { Preferences, ThemePreference } from '@/store/preferences';
import { seedPatch } from '@/store/seed';
import { usePreferences, useWorkspace } from '@/store/workspace-context';

const THEMES: Record<ThemePreference, string> = {
  system: 'Usar la configuración del sistema',
  light: 'Claro',
  dark: 'Oscuro',
};

type BooleanKey = { [K in keyof Preferences]: Preferences[K] extends boolean ? K : never }[keyof Preferences];

export default function SettingsScreen() {
  const colors = useColors();
  const workspace = useWorkspace();
  const [preferences, setPreference] = usePreferences();
  const [themeOpen, setThemeOpen] = useState(false);

  const Toggle = ({ name, title, description }: { name: BooleanKey; title: string; description: string }) => (
    <Row title={title} description={description}>
      <Switch
        value={preferences[name]}
        onValueChange={(value) => setPreference(name, value)}
        trackColor={{ true: colors.accent, false: colors.tabIdle }}
        accessibilityLabel={title}
      />
    </Row>
  );

  const reset = async () => {
    const ok = await confirm(
      '¿Restablecer el espacio de trabajo?',
      'Se borrarán todas tus páginas de este dispositivo y volverán las páginas de ejemplo.',
      'Restablecer',
    );
    if (ok) await workspace.replaceAll(seedPatch(Date.now()));
  };

  return (
    <SafeAreaView edges={['top']} style={[styles.screen, { backgroundColor: colors.sidebar }]}>
      <ScreenTitleBar title="Configuración" />
      <ScrollView contentContainerStyle={styles.content}>
        <Section title="Notificaciones" note="Se aplicarán cuando conectemos tu cuenta a un servidor.">
          {Toggle({
            name: 'pushNotifications',
            title: 'Notificaciones push en el móvil',
            description: 'Recibe notificaciones push de menciones y comentarios en tu aplicación móvil',
          })}
          {Toggle({
            name: 'upcomingMeetings',
            title: 'Próximas reuniones',
            description: 'Recibe notificaciones push antes de que empiecen los eventos del calendario',
          })}
          {Toggle({
            name: 'workspaceActivity',
            title: 'Actividad en mi espacio de trabajo',
            description:
              'Recibe mensajes de correo electrónico sobre comentarios, menciones, invitaciones a páginas, recordatorios, solicitudes de acceso y cambios en las propiedades de las bases de datos',
          })}
          {Toggle({
            name: 'alwaysEmail',
            title: 'Enviar siempre notificaciones por correo electrónico',
            description: 'Recibe mensajes de correo electrónico sobre la actividad del espacio de trabajo, incluso cuando estés usando la app',
          })}
          {Toggle({
            name: 'pageUpdates',
            title: 'Actualizaciones de la página',
            description: 'Recibe resúmenes por correo electrónico sobre las páginas que sigues y las que has creado',
          })}
          {Toggle({
            name: 'workspaceDigest',
            title: 'Resumen del espacio de trabajo',
            description: 'Recibe resúmenes sobre todo lo que pasa en tu espacio de trabajo por correo electrónico',
          })}
        </Section>

        <Section title="Preferencias">
          <Row title="Tema" description="Elige un tema para la app en este dispositivo">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Tema: ${THEMES[preferences.theme]}`}
              onPress={() => setThemeOpen(true)}
              style={[styles.select, { borderColor: colors.border, backgroundColor: colors.card }]}>
              <Text numberOfLines={1} style={[styles.selectText, { color: colors.text }]}>
                {THEMES[preferences.theme]}
              </Text>
              <Ionicons name="chevron-down" size={13} color={colors.textSecondary} />
            </Pressable>
          </Row>
          {Toggle({
            name: 'weekStartsMonday',
            title: 'Comenzar la semana el lunes',
            description: 'Esto afectará a la forma en que aparecen tus calendarios',
          })}
        </Section>

        <Section title="Sin conexión">
          <Row title="Páginas sin conexión" description="Todo tu espacio se guarda en este dispositivo y funciona sin conexión." />
        </Section>

        <Section title="Privacidad">
          {Toggle({
            name: 'recordVisits',
            title: 'Mostrar mi historial de visitas',
            description: 'Guarda las páginas que abres para mostrarlas en Recientes.',
          })}
        </Section>

        <Section title="Zona de riesgo">
          <Row
            title="Restablecer el espacio de trabajo"
            description="Borra todas tus páginas de este dispositivo y vuelve a las páginas de ejemplo.">
            <Pressable
              accessibilityRole="button"
              onPress={() => void reset()}
              style={[styles.danger, { backgroundColor: colors.danger + '1A' }]}>
              <Text style={[styles.dangerText, { color: colors.danger }]}>Restablecer</Text>
            </Pressable>
          </Row>
        </Section>
      </ScrollView>

      <ActionSheet
        visible={themeOpen}
        onClose={() => setThemeOpen(false)}
        title="Tema"
        actions={(Object.keys(THEMES) as ThemePreference[]).map((theme) => ({
          label: THEMES[theme],
          icon: theme === preferences.theme ? 'checkmark' : theme === 'dark' ? 'moon-outline' : theme === 'light' ? 'sunny-outline' : 'phone-portrait-outline',
          onPress: () => setPreference('theme', theme),
        }))}
      />
    </SafeAreaView>
  );
}

function Section({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  const colors = useColors();
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
      {children}
      {note ? <Text style={[styles.note, { color: colors.textTertiary }]}>{note}</Text> : null}
    </View>
  );
}

function Row({ title, description, children }: { title: string; description?: string; children?: ReactNode }) {
  const colors = useColors();
  return (
    <View style={[styles.row, { borderBottomColor: colors.hairline }]}>
      <View style={styles.rowText}>
        <Text style={[styles.rowTitle, { color: colors.text }]}>{title}</Text>
        {description ? <Text style={[styles.rowDescription, { color: colors.textSecondary }]}>{description}</Text> : null}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 18, paddingBottom: 60 },
  section: { marginTop: 18 },
  sectionTitle: { fontSize: 20, fontWeight: '600', marginBottom: 6 },
  note: { fontSize: 12, marginTop: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  rowText: { flex: 1, gap: 4 },
  rowTitle: { fontSize: 16, fontWeight: '500' },
  rowDescription: { fontSize: 13, lineHeight: 18 },
  select: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: StyleSheet.hairlineWidth, borderRadius: 8, paddingHorizontal: 10, height: 32, maxWidth: 190 },
  selectText: { fontSize: 13, flexShrink: 1 },
  danger: { borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6 },
  dangerText: { fontSize: 14, fontWeight: '500' },
});
