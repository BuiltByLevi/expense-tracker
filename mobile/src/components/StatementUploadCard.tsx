import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Card, IconBox } from '@/components/Card';
import { Btn } from '@/components/controls';
import { BankIcon } from '@/components/FinanceIcons';
import { useTheme } from '@/context/ThemeContext';

/**
 * Port of the web dashboard's StatementUploadCard — gradient bank icon,
 * title, supporting line, and the primary button into the import flow,
 * laid out in one wrapping row exactly like the desktop card.
 *
 * The web copy says "CSV, Excel, or PDF"; mobile says CSV or Excel because
 * PDF parsing needs a browser engine and is genuinely unavailable here.
 */
export const StatementUploadCard: React.FC<{ onOpen: () => void }> = ({ onOpen }) => {
  const { palette } = useTheme();
  return (
    <Card style={styles.card}>
      <View style={styles.left}>
        <IconBox size={44} radius={12}>
          <BankIcon size={22} color="#ffffff" />
        </IconBox>
        <View style={styles.text}>
          <Text style={[styles.title, { color: palette.textPrimary }]}>Import Bank Statement</Text>
          <Text style={[styles.sub, { color: palette.textSecondary }]}>
            Upload a CSV or Excel statement to auto-fill transactions
          </Text>
        </View>
      </View>
      <Btn label="Upload Statement" size="md" onPress={onOpen} />
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: 20,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  left: { flexDirection: 'row', alignItems: 'center', gap: 14, flexShrink: 1, minWidth: 220, flexGrow: 1 },
  text: { flexShrink: 1 },
  title: { fontSize: 14, fontWeight: '700' },
  sub: { fontSize: 12, marginTop: 2 },
});
