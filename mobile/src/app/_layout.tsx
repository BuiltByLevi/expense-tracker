import React, { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { EarningsProvider } from '@/context/EarningsContext';
import { ExpensesProvider } from '@/context/ExpensesContext';
import { IncomeProvider } from '@/context/IncomeContext';
import { ThemeProvider, useTheme } from '@/context/ThemeContext';
import { ToastProvider } from '@/context/ToastContext';

/**
 * Redirects between the authenticated tab group and the sign-in screen.
 * Rendered inside the providers so it can read auth state, and gated on
 * `loading` so a restored AsyncStorage session isn't briefly treated as
 * signed-out (which would flash the login screen on every cold start).
 */
function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const { palette } = useTheme();

  useEffect(() => {
    if (loading) return;
    const inAuthGroup = segments[0] === 'sign-in';
    if (!user && !inAuthGroup) {
      router.replace('/sign-in');
    } else if (user && inAuthGroup) {
      router.replace('/');
    }
  }, [user, loading, segments, router]);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.screenBg }}>
        <ActivityIndicator size="large" color={palette.primary} />
      </View>
    );
  }

  return <>{children}</>;
}

function RootNavigator() {
  const { palette, mode } = useTheme();
  return (
    <>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      <AuthGate>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: palette.screenBg },
          }}
        >
          {/* Same page set as the desktop dashboard: one scrolling dashboard
              plus the sub-pages it opens, each with "← Back to Dashboard". */}
          <Stack.Screen name="index" />
          <Stack.Screen name="statement" />
          <Stack.Screen name="earnings" />
          <Stack.Screen name="profile" />
          <Stack.Screen name="import" />
          <Stack.Screen name="sign-in" />
        </Stack>
      </AuthGate>
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AuthProvider>
            <ExpensesProvider>
              <IncomeProvider>
                <EarningsProvider>
                  <ToastProvider>
                    <RootNavigator />
                  </ToastProvider>
                </EarningsProvider>
              </IncomeProvider>
            </ExpensesProvider>
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
