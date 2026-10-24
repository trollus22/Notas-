import Ionicons from '@expo/vector-icons/Ionicons';
import { useRef, useState, type ComponentProps } from 'react';
import { Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View, type TextInputInstance } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { webNoOutline } from '@/components/editor/block-row';
import { FloatingBar } from '@/components/floating-bar';
import { NotionIcon } from '@/components/notion-icon';
import { PageHeader } from '@/components/page-header';
import { ActionSheet, Sheet } from '@/components/sheet';
import { FloatingBarSpace } from '@/constants/theme';
import { autoGrowProps, useAutoGrow } from '@/hooks/use-auto-grow';
import { useColors, useScheme } from '@/hooks/use-colors';
import { notConnectedYet } from '@/lib/confirm';
import {
  addView,
  boardColumns,
  createRow,
  ME,
  propertyById,
  removeView,
  rowsForView,
  setRowProperty,
  setViewFilter,
  statusGroupOf,
  tableColumns,
  toggleRowDone,
  toggleViewColumn,
  viewById,
} from '@/lib/database';
import { trashPage, updateBlock } from '@/lib/editing';
import { pageTitle } from '@/lib/format';
import { goBack, openPage } from '@/lib/navigation';
import { pageAncestors } from '@/lib/tree';
import type { Block, Property, PropertyValue } from '@/lib/types';
import { useTree, useWorkspace } from '@/store/workspace-context';

import { BoardView } from './board-view';
import { ChecklistView } from './checklist-view';
import { PropertyEditor } from './property-editor';
import { TableView } from './table-view';
import { ViewsSheet } from './views-sheet';

const GUTTER = 32;

type IconName = ComponentProps<typeof Ionicons>['name'];

export function DatabaseScreen({ database, initialViewId }: { database: Block; initialViewId?: string }) {
  const colors = useColors();
  const scheme = useScheme();
  const tree = useTree();
  const workspace = useWorkspace();

  const titleRef = useRef<TextInputInstance>(null);
  useAutoGrow(titleRef, database.text);
  const [viewId, setViewId] = useState(initialViewId);
  const [showTitle, setShowTitle] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<{ rowId: string; property: Property } | null>(null);
  const [sheet, setSheet] = useState<'views' | 'filter' | 'columns' | 'add' | 'more' | null>(null);

  const view = viewById(database, viewId);
  const rows = rowsForView(tree, database, view, query);
  const ancestors = pageAncestors(tree, database.id);
  const now = () => Date.now();

  const openRow = (row: Block) => openPage(row.id);
  const create = (props?: Record<string, PropertyValue>) => {
    const result = createRow(workspace.getTree(), database, now(), { view, props });
    workspace.apply(result.patch);
    if (result.open) openPage(result.open);
  };
  const editingRow = editing ? tree.map.get(editing.rowId) : undefined;

  const share = () => {
    const lines = rows.map((row) => `- ${pageTitle(row)}`);
    void Share.share({ message: [pageTitle(database), '', ...lines].join('\n') });
  };

  const selectableColumns = (database.schema ?? []).filter((property) => property.type !== 'text' || view?.type === 'table');

  return (
    <SafeAreaView edges={['top']} style={[styles.screen, { backgroundColor: colors.background }]}>
      <PageHeader
        title={pageTitle(database)}
        subtitle={ancestors.map((block) => block.text).join(' / ')}
        showTitle={showTitle}
        onShare={share}
        onMore={() => setSheet('more')}
      />
      <ScrollView
        scrollEventThrottle={32}
        onScroll={(event) => setShowTitle(event.nativeEvent.contentOffset.y > 100)}
        contentContainerStyle={{ paddingBottom: FloatingBarSpace + 40 }}
        keyboardShouldPersistTaps="handled">
        <View style={{ paddingHorizontal: GUTTER }}>
          <View style={styles.icon}>
            <NotionIcon icon={database.icon} size={28} empty="none" />
          </View>
          <TextInput
            ref={titleRef}
            {...autoGrowProps}
            value={database.text}
            onChangeText={(text) => workspace.apply(updateBlock(workspace.getTree(), database.id, { text }, now()))}
            placeholder="Sin título"
            placeholderTextColor={colors.textTertiary}
            multiline
            scrollEnabled={false}
            style={[styles.title, { color: colors.text }, webNoOutline]}
          />
          {database.description ? (
            <Text style={[styles.description, { color: colors.text }]}>{database.description}</Text>
          ) : null}

          <View style={styles.viewBar}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Vista: ${view?.name ?? ''}`}
              onPress={() => setSheet('views')}
              style={({ pressed }) => [styles.viewPill, { backgroundColor: pressed ? colors.surfacePressed : colors.surface }]}>
              <Ionicons name={(view?.icon ?? 'grid-outline') as IconName} size={16} color={colors.text} />
              <Text numberOfLines={1} style={[styles.viewName, { color: colors.text }]}>
                {view?.name}
              </Text>
              <Ionicons name="chevron-down" size={13} color={colors.textSecondary} />
            </Pressable>
            <View style={styles.viewTools}>
              <Pressable accessibilityLabel="Buscar en la base de datos" hitSlop={6} onPress={() => setSearchOpen((open) => !open)}>
                <Ionicons name="search" size={19} color={searchOpen ? colors.accent : colors.textSecondary} />
              </Pressable>
              <Pressable accessibilityLabel="Filtro" hitSlop={6} onPress={() => setSheet('filter')}>
                <Ionicons name="filter" size={19} color={view?.filter ? colors.accent : colors.textSecondary} />
              </Pressable>
              <Pressable accessibilityLabel="Propiedades" hitSlop={6} onPress={() => setSheet('columns')}>
                <Ionicons name="options-outline" size={20} color={colors.textSecondary} />
              </Pressable>
              <View style={[styles.newButton, { backgroundColor: colors.accent }]}>
                <Pressable accessibilityRole="button" accessibilityLabel="Nueva tarea" onPress={() => create()} style={styles.newMain}>
                  <Ionicons name="add" size={21} color="#FFFFFF" />
                </Pressable>
                <View style={styles.newDivider} />
                <Pressable accessibilityRole="button" accessibilityLabel="Más formas de crear" onPress={() => setSheet('add')} style={styles.newMore}>
                  <Ionicons name="chevron-down" size={14} color="#FFFFFF" />
                </Pressable>
              </View>
            </View>
          </View>

          {searchOpen ? (
            <View style={[styles.search, { backgroundColor: colors.surface }]}>
              <Ionicons name="search" size={16} color={colors.textSecondary} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                autoFocus
                placeholder="Buscar…"
                placeholderTextColor={colors.textTertiary}
                style={[styles.searchInput, { color: colors.text }, webNoOutline]}
              />
            </View>
          ) : null}
        </View>

        {view?.type === 'board' ? (
          <BoardView
            columns={boardColumns(database, view, rows)}
            groupBy={propertyById(database, view.groupBy)}
            cardProperties={(database.schema ?? []).filter((property) => property.type === 'select' || property.type === 'multiSelect')}
            gutter={GUTTER}
            colors={colors}
            scheme={scheme}
            onOpenRow={openRow}
            onCreateRow={create}
          />
        ) : view?.type === 'checklist' ? (
          <ChecklistView
            rows={rows}
            groupOf={(row) => statusGroupOf(database, row)}
            gutter={GUTTER}
            colors={colors}
            onToggle={(row) => workspace.apply(toggleRowDone(workspace.getTree(), database, row.id, now()))}
            onOpenRow={openRow}
            onCreateRow={() => create()}
          />
        ) : (
          <TableView
            rows={rows}
            columns={tableColumns(database, view)}
            gutter={GUTTER}
            colors={colors}
            scheme={scheme}
            emptyActions={view?.filter ? { onEditFilters: () => setSheet('filter') } : undefined}
            handlers={{
              onOpenRow: openRow,
              onEditProperty: (row, property) => setEditing({ rowId: row.id, property }),
              onCreateRow: () => create(),
            }}
          />
        )}
      </ScrollView>
      <FloatingBar mode="menu" />

      <PropertyEditor
        property={editing?.property ?? null}
        value={editingRow?.props?.[editing?.property.id ?? '']}
        onChange={(value) => {
          if (editing) workspace.apply(setRowProperty(workspace.getTree(), editing.rowId, editing.property.id, value, now()));
        }}
        onClose={() => setEditing(null)}
      />

      <ViewsSheet
        visible={sheet === 'views'}
        views={database.views ?? []}
        currentId={view?.id}
        colors={colors}
        onClose={() => setSheet(null)}
        onSelect={(selected) => setViewId(selected.id)}
        onRemove={(removed) => {
          workspace.apply(removeView(database, removed.id, now()));
          if (removed.id === view?.id) setViewId(undefined);
        }}
        onAdd={(type) => {
          const { patch, view: added } = addView(database, type, now());
          workspace.apply(patch);
          setViewId(added.id);
          setSheet(null);
        }}
        onNewSource={() => notConnectedYet('Nueva fuente de datos')}
      />

      <Sheet visible={sheet === 'filter'} onClose={() => setSheet(null)} title="Filtro">
        {[
          { label: 'Todas las tareas', filter: null },
          { label: 'Asignadas a mí', filter: { propertyId: 'assignee', value: ME } },
          { label: 'Sin asignar', filter: { propertyId: 'assignee', value: null } },
        ]
          .filter((option) => !option.filter || propertyById(database, option.filter.propertyId))
          .map((option) => {
            const active = option.filter
              ? view?.filter?.propertyId === option.filter.propertyId && view.filter.value === option.filter.value
              : !view?.filter;
            return (
              <Pressable
                key={option.label}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => {
                  if (view) workspace.apply(setViewFilter(database, view.id, option.filter, now()));
                  setSheet(null);
                }}
                style={({ pressed }) => [styles.sheetRow, pressed && { backgroundColor: colors.surfacePressed }]}>
                <Text style={[styles.sheetLabel, { color: colors.text }]}>{option.label}</Text>
                {active ? <Ionicons name="checkmark" size={20} color={colors.accent} /> : null}
              </Pressable>
            );
          })}
      </Sheet>

      <Sheet visible={sheet === 'columns'} onClose={() => setSheet(null)} title="Propiedades">
        {view?.type === 'table' ? (
          selectableColumns.map((property) => {
            const shown = tableColumns(database, view).some((column) => column.id === property.id);
            return (
              <Pressable
                key={property.id}
                accessibilityRole="switch"
                accessibilityState={{ checked: shown }}
                onPress={() => workspace.apply(toggleViewColumn(database, view.id, property.id, now()))}
                style={({ pressed }) => [styles.sheetRow, pressed && { backgroundColor: colors.surfacePressed }]}>
                <Text style={[styles.sheetLabel, { color: colors.text }]}>{property.name}</Text>
                <Ionicons name={shown ? 'eye-outline' : 'eye-off-outline'} size={20} color={shown ? colors.text : colors.textTertiary} />
              </Pressable>
            );
          })
        ) : (
          <Text style={[styles.sheetNote, { color: colors.textSecondary }]}>
            Las columnas se eligen en las vistas de tabla.
          </Text>
        )}
      </Sheet>

      <ActionSheet
        visible={sheet === 'add'}
        onClose={() => setSheet(null)}
        actions={[
          { label: 'Nueva tarea', icon: 'add-outline', onPress: () => create() },
          { label: 'Nueva vista', icon: 'albums-outline', onPress: () => setTimeout(() => setSheet('views'), 450) },
        ]}
      />
      <ActionSheet
        visible={sheet === 'more'}
        onClose={() => setSheet(null)}
        title={pageTitle(database)}
        actions={[
          {
            label: database.favorite ? 'Quitar de favoritos' : 'Añadir a favoritos',
            icon: database.favorite ? 'star' : 'star-outline',
            onPress: () => workspace.apply(updateBlock(workspace.getTree(), database.id, { favorite: !database.favorite }, now())),
          },
          {
            label: 'Mover a la papelera',
            icon: 'trash-outline',
            destructive: true,
            onPress: () => {
              workspace.apply(trashPage(workspace.getTree(), database.id, now()));
              goBack();
            },
          },
        ]}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  icon: { marginTop: 38, marginBottom: 12, alignSelf: 'flex-start' },
  title: { fontSize: 31, lineHeight: 38, fontWeight: '700', paddingVertical: 0, paddingHorizontal: 0 },
  description: { fontSize: 14, marginTop: 2, marginLeft: 3 },
  viewBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 26, marginBottom: 8 },
  viewPill: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 36, borderRadius: 18, paddingHorizontal: 10, flexShrink: 1 },
  viewName: { fontSize: 15, fontWeight: '500', flexShrink: 1 },
  viewTools: { flexDirection: 'row', alignItems: 'center', gap: 13, marginLeft: 12 },
  newButton: { flexDirection: 'row', alignItems: 'center', height: 32, borderRadius: 6, overflow: 'hidden' },
  newMain: { width: 31, height: 32, alignItems: 'center', justifyContent: 'center' },
  newDivider: { width: StyleSheet.hairlineWidth, height: 32, backgroundColor: 'rgba(255,255,255,0.4)' },
  newMore: { width: 28, height: 32, alignItems: 'center', justifyContent: 'center' },
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 8, paddingHorizontal: 10, height: 36, marginBottom: 8 },
  searchInput: { flex: 1, minWidth: 0, fontSize: 15, paddingVertical: 0 },
  sheetRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 48, paddingHorizontal: 20 },
  sheetLabel: { fontSize: 16 },
  sheetNote: { fontSize: 15, paddingHorizontal: 20, paddingBottom: 12 },
});
