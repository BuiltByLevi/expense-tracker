import React from 'react';
import { Platform, Text } from 'react-native';
import { Tabs } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';

/**
 * Glyph-based tab icons keep the bundle free of an icon-font dependency while
 * staying legible at tab-bar size. Each is a single character so it inherits
 * the active/inactive tint without extra plumbing.
 */
const ICONS: Record<string, string> = {
  index: '◎',
  transactions: '≡',
  add: '＋',
  analytics: '◑',
  profile: '☺',
};

export default function TabsLayout() {
  const { palette } = useTheme();

  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: palette.primary,
        tabBarInactiveTintColor: palette.textTertiary,
        tabBarStyle: {
          backgroundColor: palette.cardBg,
          borderTopColor: palette.cardBorder,
          // Android needs explicit height/padding or labels clip on devices
          // with a gesture bar.
          height: Platform.OS === 'android' ? 64 : undefined,
          paddingBottom: Platform.OS === 'android' ? 8 : undefined,
          paddingTop: 6,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarIcon: ({ color }) => (
          <Text style={{ color, fontSize: 20, lineHeight: 24 }}>{ICONS[route.name] ?? '•'}</Text>
        ),
      })}
    >
      <Tabs.Screen name="index" options={{ title: 'Dashboard' }} />
      <Tabs.Screen name="transactions" options={{ title: 'Transactions' }} />
      <Tabs.Screen name="add" options={{ title: 'Add' }} />
      <Tabs.Screen name="analytics" options={{ title: 'Analytics' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}
