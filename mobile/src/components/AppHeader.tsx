import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { BadgePill, Card, IconBox } from '@/components/Card';
import { LogoMark } from '@/components/FinanceIcons';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { FINANCIAL_QUOTES, getDailyQuote } from '@shared/quotes';
import { spacing } from '@/theme';

/**
 * The branded header card from the web dashboard: logo mark in a gradient
 * icon box, PRATIQ wordmark, the "Pro Expense Tracker" pill, the welcome
 * line, and the day's financial quote.
 *
 * The quote comes from shared/quotes via getDailyQuote, so the phone and the
 * web app show the SAME quote on the same calendar day.
 */
export const AppHeader: React.FC = () => {
  const { palette } = useTheme();
  const { user } = useAuth();
  const [quote] = useState(() => getDailyQuote(FINANCIAL_QUOTES));

  return (
    <Card style={styles.card}>
      <View style={styles.brandRow}>
        <IconBox size={26} radius={9}>
          <LogoMark size={15} color="#ffffff" />
        </IconBox>
        <Text style={[styles.brand, { color: palette.textPrimary }]}>PRATIQ</Text>
        <BadgePill label="Pro Expense Tracker" />
      </View>

      <Text style={[styles.welcome, { color: palette.textSecondary }]} numberOfLines={1}>
        Welcome back, {user?.displayName || user?.email?.split('@')[0] || 'there'}
      </Text>

      <Text style={[styles.quote, { color: palette.textTertiary }]}>
        “{quote.text}” — {quote.author}
      </Text>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: { paddingVertical: spacing.md, alignItems: 'center' },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  brand: { fontSize: 18, fontWeight: '800', letterSpacing: 0.2 },
  welcome: { fontSize: 11, marginTop: 3 },
  quote: { fontSize: 10, fontStyle: 'italic', marginTop: 4, textAlign: 'center' },
});
