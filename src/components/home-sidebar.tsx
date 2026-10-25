import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ActionSheet, type SheetAction } from '@/components/sheet';
import { SidebarPageRow, SidebarSection, TeamspaceRow } from '@/components/sidebar';
import { FloatingBarSpace } from '@/constants/theme';
import { useColors } from '@/hooks/use-colors';
import { trashPage, updateBlock } from '@/lib/editing';
import { pageTitle } from '@/lib/format';
import { favoritePages, privatePages, teamspaces } from '@/lib/tree';
import type { Block } from '@/lib/types';
import { createAndOpenPage } from '@/store/actions';
import { useTree, useWorkspace } from '@/store/workspace-context';

/**
 * The Inicio sidebar: Recientes, Favoritos, Privado and Espacios de equipo.
 * On iPad it is shown as a fixed column (`fixed`), with its own top safe area.
 */
export function HomeSidebar({ fixed = false }: { fixed?: boolean }) {
  const colors = useColors();
  const tree = useTree();
  const workspace = useWorkspace();
  const [selected, setSelected] = useState<Block | null>(null);
  const [menu, setMenu] = useState<'private' | 'teams' | null>(null);

  const favorites = favoritePages(tree);
  const privates = privatePages(tree);
  const teams = teamspaces(tree);

  const newPage = (parentId: string | null) => createAndOpenPage(workspace, parentId);

  const selectedActions = (block: Block): SheetAction[] => {
    if (block.type === 'teamspace') {
      return [{ label: 'Añadir página', icon: 'add-outline', onPress: () => newPage(block.id) }];
    }
    return [
      {
        label: block.favorite ? 'Quitar de favoritos' : 'Añadir a favoritos',
        icon: block.favorite ? 'star' : 'star-outline',
        onPress: () => workspace.apply(updateBlock(workspace.getTree(), block.id, { favorite: !block.favorite }, Date.now())),
      },
      ...(block.type === 'page'
        ? [{ label: 'Añadir subpágina', icon: 'add-outline' as const, onPress: () => newPage(block.id) }]
        : []),
      {
        label: 'Mover a la papelera',
        icon: 'trash-outline',
        destructive: true,
        onPress: () => workspace.apply(trashPage(workspace.getTree(), block.id, Date.now())),
      },
    ];
  };

  const list = (
    <ScrollView
      style={{ backgroundColor: colors.sidebar }}
      contentContainerStyle={{ paddingBottom: fixed ? 40 : FloatingBarSpace + 20 }}>
      <Pressable accessibilityRole="button" onPress={() => router.push('/recents')} style={styles.recents}>
        <Text style={[styles.recentsLabel, { color: colors.textSecondary }]}>Recientes</Text>
        <Ionicons name="chevron-forward" size={14} color={colors.textSecondary} />
      </Pressable>

      {favorites.length > 0 ? (
        <SidebarSection id="favorites" title="Favoritos">
          {favorites.map((page) => (
            <SidebarPageRow key={page.id} page={page} depth={0} topLevel onLongPress={setSelected} />
          ))}
        </SidebarSection>
      ) : null}

      {privates.length > 0 ? (
        <SidebarSection id="private" title="Privado" onMore={() => setMenu('private')}>
          {privates.map((page) => (
            <SidebarPageRow key={page.id} page={page} depth={0} topLevel onLongPress={setSelected} />
          ))}
        </SidebarSection>
      ) : null}

      <SidebarSection id="teams" title="Espacios de equipo" onMore={() => setMenu('teams')}>
        {teams.map((team) => (
          <TeamspaceRow key={team.id} teamspace={team} onLongPress={setSelected} />
        ))}
      </SidebarSection>
    </ScrollView>
  );

  return (
    <>
      {fixed ? (
        <SafeAreaView edges={['top']} style={styles.fixed}>
          {list}
        </SafeAreaView>
      ) : (
        list
      )}

      <ActionSheet
        visible={menu !== null}
        onClose={() => setMenu(null)}
        title={menu === 'private' ? 'Privado' : 'Espacios de equipo'}
        actions={
          menu === 'private'
            ? [{ label: 'Nueva página', icon: 'create-outline', onPress: () => newPage(null) }]
            : teams.map((team) => ({
                label: `Nueva página en ${team.text}`,
                icon: 'add-outline' as const,
                onPress: () => newPage(team.id),
              }))
        }
      />
      <ActionSheet
        visible={selected !== null}
        onClose={() => setSelected(null)}
        title={selected ? (selected.type === 'teamspace' ? selected.text : pageTitle(selected)) : undefined}
        actions={selected ? selectedActions(selected) : []}
      />
    </>
  );
}

const styles = StyleSheet.create({
  fixed: { flex: 1 },
  recents: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 20, paddingTop: 13 },
  recentsLabel: { fontSize: 15 },
});
