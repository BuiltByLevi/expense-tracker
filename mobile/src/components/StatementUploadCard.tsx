import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Card, IconBox } from '@/components/Card';
import { BankIcon } from '@/components/FinanceIcons';
import { useTheme } from '@/context/ThemeContext';
import { radius, spacing } from '@/theme';

interface Props {
  onOpen: () => void;
}

/**
 * Port of the web dashboard's StatementUploadCard — gradient bank icon,
 * title, supporting line, and the primary button into the import flow.
 *
 * The web copy says "CSV, Excel, or PDF"; mobile says CSV or Excel because
 * PDF parsing needs a browser engine and is genuinely unavailable here.
 */
export const StatementUploadCard: React.FC<Props> = ({ onOpen }) => {
  const { palette } = useTheme();

  return (
    <Card style={styles.card}>
      <View style={styles.left}>
        <IconBox size={44} radius={12}>
          <BankIcon size={22} color="#ffffff" />
        </IconBox>
        <View style={styles.text}>
          <Text style={[styles.title, { color: palette.textPrimary }]}>
            Import Bank Statement
          </Text>
          <Text style={[styles.sub, { color: palette.textSecondary }]} numberOfLines={2}>
            Upload a CSV or Excel statement to auto-fill transactions
          </Text>
        </View>
      </View>

      <Pressable onPress={onOpen} style={({ pressed }) => [styles.btnWrap, pressed && styles.pressed]}>
        <LinearGradient
          colors={palette.primaryGradient as unknown as [string, string]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.btn}
        >
          <Text style={styles.btnText}>Upload Statement</Text>
        </LinearGradient>
      </Pressable>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: { gap: spacing.md },
  left: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  text: { flexShrink: 1 },
  title: { fontSize: 14, fontWeight: '700' },
  sub: { fontSize: 12, marginTop: 2 },
  btnWrap: { borderRadius: radius.md, overflow: 'hidden' },
  pressed: { opacity: 0.85 },
  btn: { height: 42, alignItems: 'center', justifyContent: 'center' },
  btnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
});
