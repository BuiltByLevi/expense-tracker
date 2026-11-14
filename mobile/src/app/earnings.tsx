import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { format } from 'date-fns';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card, GlassPage, PageHeader, StatusBadge } from '@/components/Card';
import { Btn, Input, Select } from '@/components/controls';
import { AlertIcon, CheckIcon, InfoIcon } from '@/components/FinanceIcons';
import { useTheme } from '@/context/ThemeContext';
import { useEarningsHistoryLogic } from '@/hooks/useEarningsHistoryLogic';

const COLS = { check: 28, month: 190, amount: 140, status: 110, action: 150 };

const Checkbox: React.FC<{ checked: boolean; partial?: boolean; disabled?: boolean; onPress: () => void; label: string }> = ({
  checked,
  partial,
  disabled,
  onPress,
  label,
}) => {
  const { palette } = useTheme();
  const on = checked || partial;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={8}
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      accessibilityState={{ checked: partial ? 'mixed' : checked, disabled }}
      style={[
        styles.checkbox,
        {
          backgroundColor: on ? palette.primary : 'transparent',
          borderColor: on ? palette.primary : palette.textTertiary,
          opacity: disabled ? 0.4 : 1,
        },
      ]}
    >
      {checked ? <CheckIcon size={11} color="#ffffff" strokeWidth={3} /> : partial ? <View style={styles.dash} /> : null}
    </Pressable>
  );
};

/** Port of Dashboard/EarningsHistoryPageWeb ("Manage Earnings"). */
export default function EarningsScreen() {
  const { palette } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const h = useEarningsHistoryLogic();
  const now = new Date();

  const yearOptions = [
    ['All', 'All years'] as const,
    ...h.availableYears.map((y) => [String(y), String(y)] as const),
  ];

  const bulkBar =
    h.selectedMonths.size > 0 ? (
      <View style={[styles.bulkWrap, { bottom: insets.bottom + 12 }]}>
        <LinearGradient
          colors={['#1e293b', '#0f172a']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.bulk, { borderColor: `${palette.accentBright}4D` }]}
        >
          <Text style={styles.bulkCount}>
            {h.selectedMonths.size} {h.selectedMonths.size === 1 ? 'MONTH' : 'MONTHS'} SELECTED
          </Text>
          <View style={styles.bulkInputWrap}>
            <Text style={styles.bulkRupee}>₹</Text>
            <TextInput
              value={h.bulkAmount}
              onChangeText={h.setBulkAmount}
              placeholder="Enter new amount"
              placeholderTextColor="#64748b"
              keyboardType="decimal-pad"
              style={styles.bulkInput}
              onSubmitEditing={h.handleBulkSaveAmount}
            />
          </View>
          <View style={styles.bulkRow}>
            <Pressable
              onPress={() => h.handleBulkStatus('confirmed')}
              disabled={h.bulkSaving}
              style={[styles.bulkStatus, { backgroundColor: `${palette.success}26`, borderColor: `${palette.success}4D` }]}
            >
              <CheckIcon size={11} color={palette.accentBright} strokeWidth={2.5} />
              <Text style={[styles.bulkStatusText, { color: palette.accentBright }]}>Mark Confirmed</Text>
            </Pressable>
            <Pressable
              onPress={() => h.handleBulkStatus('estimated')}
              disabled={h.bulkSaving}
              style={[styles.bulkStatus, { backgroundColor: 'rgba(245, 158, 11, 0.15)', borderColor: 'rgba(245, 158, 11, 0.3)' }]}
            >
              <AlertIcon size={11} color="#fbbf24" strokeWidth={2.5} />
              <Text style={[styles.bulkStatusText, { color: '#fbbf24' }]}>Mark Estimated</Text>
            </Pressable>
          </View>
          <View style={styles.bulkRow}>
            <Pressable onPress={h.clearSelection} style={styles.bulkCancel}>
              <Text style={styles.bulkCancelText}>Cancel</Text>
            </Pressable>
            <Btn
              label={h.bulkSaving ? 'Saving...' : `Update ${h.selectedMonths.size}`}
              onPress={h.handleBulkSaveAmount}
              disabled={h.bulkSaving || !h.bulkAmount}
              style={styles.flex}
            />
          </View>
        </LinearGradient>
      </View>
    ) : null;

  const th = (label: string, width: number, align: 'left' | 'right' | 'center' = 'left') => (
    <Text style={[styles.th, { width, textAlign: align, color: palette.textSecondary }]}>{label}</Text>
  );

  return (
    <GlassPage
      footer={bulkBar}
      contentStyle={h.selectedMonths.size > 0 ? { paddingBottom: 300 } : undefined}
    >
      <PageHeader
        title="Earnings History"
        subtitle="Select months and update individually or in bulk."
        onBack={() => router.back()}
        right={
          <Select
            value={String(h.yearFilter)}
            options={yearOptions}
            onChange={(v) => h.setYearFilter(v === 'All' ? 'All' : parseInt(v, 10))}
            title="Filter by year"
            style={styles.yearSelect}
          />
        }
      />

      <Card style={[styles.tip, { borderColor: `${palette.primary}33`, backgroundColor: `${palette.primary}0D` }]}>
        <InfoIcon size={14} color={palette.primary} />
        <Text style={[styles.tipText, { color: palette.textSecondary }]}>
          <Text style={{ fontWeight: '700' }}>Tip:</Text> Tick the checkboxes to select multiple months, then update
          amounts or status in bulk.
        </Text>
      </Card>

      <Card style={styles.tableCard}>
        <ScrollView horizontal keyboardShouldPersistTaps="handled">
          <View>
            <View style={[styles.tr, styles.thead, { borderBottomColor: `${palette.primary}33` }]}>
              <View style={{ width: COLS.check }}>
                <Checkbox
                  checked={h.allSelected}
                  partial={h.someSelected}
                  onPress={h.toggleSelectAll}
                  label="Select all months"
                />
              </View>
              {th('MONTH', COLS.month)}
              {th('EARNINGS', COLS.amount, 'right')}
              {th('STATUS', COLS.status, 'center')}
              {th('ACTION', COLS.action, 'center')}
            </View>
            {h.months.map(({ year, month }) => {
              const key = `${year}-${month}`;
              const imported = h.getImportDerived(year, month);
              const record = h.getEarningsForMonth(year, month);
              const amount = imported ? imported.amount : record ? record.amount : h.defaultEarnings;
              const status = imported ? 'confirmed' : record ? record.status : 'missing';
              const isEditing = h.editingKey === key;
              const isCurrent = year === now.getFullYear() && month === now.getMonth();
              const selected = h.selectedMonths.has(key);
              return (
                <View
                  key={key}
                  style={[
                    styles.tr,
                    styles.row,
                    {
                      backgroundColor: selected
                        ? `${palette.primary}14`
                        : isCurrent
                          ? `${palette.primary}0A`
                          : 'transparent',
                      opacity: imported ? 0.85 : 1,
                    },
                  ]}
                >
                  <View style={{ width: COLS.check }}>
                    <Checkbox
                      checked={selected}
                      disabled={!!imported}
                      onPress={() => h.toggleSelection(key)}
                      label={`Select ${format(new Date(year, month), 'MMMM yyyy')}`}
                    />
                  </View>
                  <View style={[styles.monthCell, { width: COLS.month }]}>
                    <Text style={[styles.month, { color: palette.textPrimary }]}>
                      {format(new Date(year, month), 'MMMM yyyy')}
                    </Text>
                    {isCurrent ? <Text style={[styles.tag, { color: palette.primary }]}>CURRENT</Text> : null}
                    {imported ? <Text style={[styles.tag, { color: palette.success }]}>FROM IMPORT</Text> : null}
                  </View>
                  <View style={{ width: COLS.amount, alignItems: 'flex-end' }}>
                    {isEditing ? (
                      <Input
                        value={h.editValue}
                        onChangeText={h.setEditValue}
                        keyboardType="decimal-pad"
                        autoFocus
                        onSubmitEditing={() => h.handleSave(year, month)}
                        containerStyle={{ width: 130 }}
                        style={styles.editInput}
                      />
                    ) : (
                      <Text style={[styles.amount, { color: palette.textPrimary }]}>
                        ₹{amount.toLocaleString('en-IN')}
                      </Text>
                    )}
                  </View>
                  <View style={{ width: COLS.status, alignItems: 'center' }}>
                    <StatusBadge status={status} />
                  </View>
                  <View style={[styles.actionCell, { width: COLS.action }]}>
                    {imported ? (
                      <Text style={[styles.notEditable, { color: palette.textTertiary }]}>Not editable</Text>
                    ) : isEditing ? (
                      <>
                        <Btn size="xs" label="Save" onPress={() => h.handleSave(year, month)} />
                        <Btn size="xs" variant="ghost" label="Cancel" onPress={() => h.setEditingKey(null)} />
                      </>
                    ) : (
                      <Btn size="xs" variant="ghost" label="Edit" onPress={() => h.handleEditClick(year, month, amount)} />
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        </ScrollView>
      </Card>
    </GlassPage>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  yearSelect: { paddingVertical: 8, minHeight: 40, minWidth: 110 },
  tip: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 16, paddingHorizontal: 20 },
  tipText: { fontSize: 13, flexShrink: 1 },
  tableCard: { padding: 0, overflow: 'hidden' },
  tr: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20 },
  thead: { paddingVertical: 16, borderBottomWidth: 1, backgroundColor: 'rgba(0,0,0,0.02)' },
  th: { fontSize: 12, fontWeight: '600' },
  row: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.04)' },
  checkbox: { width: 18, height: 18, borderRadius: 4, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  dash: { width: 8, height: 2, backgroundColor: '#ffffff' },
  monthCell: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  month: { fontSize: 14, fontWeight: '600' },
  tag: { fontSize: 10, fontWeight: '700' },
  amount: { fontSize: 14, fontWeight: '700' },
  editInput: { paddingVertical: 8, paddingHorizontal: 8, textAlign: 'right', minHeight: 38 },
  actionCell: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  notEditable: { fontSize: 11 },
  bulkWrap: { position: 'absolute', left: 12, right: 12 },
  bulk: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 20 },
    elevation: 20,
  },
  bulkCount: { fontSize: 11, color: '#94a3b8', fontWeight: '600', letterSpacing: 0.5 },
  bulkInputWrap: { justifyContent: 'center' },
  bulkRupee: { position: 'absolute', left: 14, color: '#94a3b8', fontWeight: '600', fontSize: 14, zIndex: 1 },
  bulkInput: {
    paddingVertical: 10,
    paddingLeft: 32,
    paddingRight: 14,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.2)',
    borderRadius: 10,
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  bulkRow: { flexDirection: 'row', gap: 8 },
  bulkStatus: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  bulkStatusText: { fontSize: 12, fontWeight: '600' },
  bulkCancel: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.2)',
  },
  bulkCancelText: { color: '#cbd5e1', fontSize: 13, fontWeight: '600' },
});
