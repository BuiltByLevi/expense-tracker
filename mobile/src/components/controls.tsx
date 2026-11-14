import React, { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/context/ThemeContext';
import { CheckIcon, ChevronDownIcon } from '@/components/FinanceIcons';

/**
 * Ports of the web's form controls (globals.css .btn / .tab / .input /
 * .input-label / .switch, and native <select>).
 */

type BtnVariant = 'primary' | 'ghost' | 'danger';
type BtnSize = 'xs' | 'sm' | 'md' | 'lg';

const SIZES: Record<BtnSize, { py: number; px: number; font: number }> = {
  xs: { py: 6, px: 10, font: 11 },
  sm: { py: 8, px: 14, font: 12 },
  md: { py: 11, px: 18, font: 13 },
  lg: { py: 14, px: 20, font: 14 },
};

export const Btn: React.FC<{
  label: string;
  onPress: () => void;
  variant?: BtnVariant;
  size?: BtnSize;
  disabled?: boolean;
  busy?: boolean;
  icon?: React.ReactNode;
  color?: string;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}> = ({ label, onPress, variant = 'primary', size = 'md', disabled, busy, icon, color, style, textStyle }) => {
  const { palette } = useTheme();
  const s = SIZES[size];
  const fg =
    color ?? (variant === 'ghost' ? palette.textPrimary : '#ffffff');
  const inner = (
    <>
      {busy ? <ActivityIndicator size="small" color={fg} /> : icon}
      <Text style={[{ color: fg, fontSize: s.font, fontWeight: '600' }, textStyle]} numberOfLines={1}>
        {label}
      </Text>
    </>
  );
  const box: ViewStyle = {
    paddingVertical: s.py,
    paddingHorizontal: s.px,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  };

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || busy}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.btnWrap,
        { opacity: disabled ? 0.6 : pressed ? 0.85 : 1 },
        variant === 'primary' && styles.primaryShadow,
        variant === 'primary' && { shadowColor: palette.primary },
        style,
      ]}
    >
      {variant === 'primary' ? (
        <LinearGradient
          colors={palette.actionGradient as unknown as [string, string]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={box}
        >
          {inner}
        </LinearGradient>
      ) : (
        <View
          style={[
            box,
            variant === 'ghost'
              ? { backgroundColor: palette.glassBg, borderWidth: 1, borderColor: palette.inputBorder }
              : { backgroundColor: '#ef4444' },
          ]}
        >
          {inner}
        </View>
      )}
    </Pressable>
  );
};

/** .tab-container with .tab / .tab.active. */
export function TabGroup<T extends string>({
  options,
  value,
  onChange,
  size = 'md',
  style,
}: {
  options: readonly (readonly [T, string])[];
  value: T;
  onChange: (v: T) => void;
  size?: 'sm' | 'md';
  style?: StyleProp<ViewStyle>;
}) {
  const { palette, mode } = useTheme();
  const pad = size === 'sm' ? { py: 6, px: 12, font: 12 } : { py: 10, px: 16, font: 13 };
  return (
    <View
      style={[
        styles.tabs,
        { backgroundColor: mode === 'dark' ? 'rgba(10, 18, 36, 0.6)' : palette.glassBg, padding: size === 'sm' ? 3 : 4 },
        style,
      ]}
    >
      {options.map(([key, label]) => {
        const active = key === value;
        const text = (
          <Text
            style={{ color: active ? '#ffffff' : palette.textSecondary, fontSize: pad.font, fontWeight: '600' }}
            numberOfLines={1}
          >
            {label}
          </Text>
        );
        const tabBox: ViewStyle = {
          paddingVertical: pad.py,
          paddingHorizontal: pad.px,
          borderRadius: 10,
          alignItems: 'center',
          justifyContent: 'center',
        };
        return (
          <Pressable
            key={key}
            onPress={() => onChange(key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            style={styles.tabItem}
          >
            {active ? (
              <LinearGradient
                colors={palette.actionGradient as unknown as [string, string]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={tabBox}
              >
                {text}
              </LinearGradient>
            ) : (
              <View style={tabBox}>{text}</View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

/** .input-label */
export const Label: React.FC<{ children: string }> = ({ children }) => {
  const { palette } = useTheme();
  return <Text style={[styles.label, { color: palette.textSecondary }]}>{children.toUpperCase()}</Text>;
};

export const FieldError: React.FC<{ message?: string }> = ({ message }) => {
  const { palette } = useTheme();
  if (!message) return null;
  return <Text style={[styles.fieldError, { color: palette.danger }]}>{message}</Text>;
};

/** .input — optional ₹ prefix, and the red error treatment from ExpenseForm. */
export const Input: React.FC<
  TextInputProps & { error?: boolean; prefix?: string; containerStyle?: StyleProp<ViewStyle> }
> = ({ error, prefix, style, containerStyle, ...rest }) => {
  const { palette } = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <View style={containerStyle}>
      {prefix ? (
        <Text
          style={[styles.prefix, { color: error ? palette.danger : palette.textSecondary }]}
          pointerEvents="none"
        >
          {prefix}
        </Text>
      ) : null}
      <TextInput
        placeholderTextColor={palette.textTertiary}
        {...rest}
        onFocus={(e) => {
          setFocused(true);
          rest.onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          rest.onBlur?.(e);
        }}
        style={[
          styles.input,
          {
            color: palette.textPrimary,
            backgroundColor: error ? 'rgba(239, 68, 68, 0.05)' : palette.inputBg,
            borderColor: error ? palette.danger : focused ? palette.primary : palette.inputBorder,
          },
          prefix ? { paddingLeft: 32 } : null,
          rest.editable === false && { opacity: 0.6 },
          style,
        ]}
      />
    </View>
  );
};

/** Native <select> stand-in: an .input-styled trigger opening a picker sheet. */
export function Select<T extends string>({
  value,
  options,
  onChange,
  title,
  style,
}: {
  value: T;
  options: readonly (T | readonly [T, string])[];
  onChange: (v: T) => void;
  title?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const { palette } = useTheme();
  const [open, setOpen] = useState(false);
  const items = options.map((o) => (typeof o === 'string' ? ([o, o] as const) : o));
  const current = items.find(([k]) => k === value)?.[1] ?? value;

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        style={[
          styles.input,
          styles.selectTrigger,
          { backgroundColor: palette.inputBg, borderColor: palette.inputBorder },
          style,
        ]}
      >
        <Text style={[styles.selectText, { color: palette.textPrimary }]} numberOfLines={1}>
          {current}
        </Text>
        <ChevronDownIcon size={14} color={palette.textSecondary} />
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={[styles.overlay, { backgroundColor: palette.modalOverlay }]} onPress={() => setOpen(false)}>
          <Pressable
            style={[styles.sheet, { backgroundColor: palette.modalBg, borderColor: palette.modalBorder }]}
            onPress={() => {}}
          >
            {title ? <Text style={[styles.sheetTitle, { color: palette.textPrimary }]}>{title}</Text> : null}
            <FlatList
              data={items}
              keyExtractor={([k]) => k}
              renderItem={({ item: [k, label] }) => {
                const active = k === value;
                return (
                  <Pressable
                    onPress={() => {
                      onChange(k);
                      setOpen(false);
                    }}
                    style={({ pressed }) => [
                      styles.option,
                      (active || pressed) && { backgroundColor: palette.glassBg },
                    ]}
                  >
                    <Text
                      style={{
                        color: active ? palette.primary : palette.textPrimary,
                        fontWeight: active ? '700' : '500',
                        fontSize: 14,
                        flex: 1,
                      }}
                    >
                      {label}
                    </Text>
                    {active ? <CheckIcon size={14} color={palette.primary} strokeWidth={2.5} /> : null}
                  </Pressable>
                );
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

/** .switch — the dark-mode toggle in ProfileMenu. */
export const Switch: React.FC<{ value: boolean; onChange: (v: boolean) => void; label?: string }> = ({
  value,
  onChange,
  label,
}) => {
  const { palette } = useTheme();
  const knob = <View style={[styles.knob, { transform: [{ translateX: value ? 16 : 0 }] }]} />;
  return (
    <Pressable
      onPress={() => onChange(!value)}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel={label}
      hitSlop={8}
    >
      {value ? (
        <LinearGradient
          colors={palette.primaryGradient as unknown as [string, string]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.track}
        >
          {knob}
        </LinearGradient>
      ) : (
        <View style={[styles.track, { backgroundColor: 'rgba(148, 163, 184, 0.4)' }]}>{knob}</View>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  btnWrap: { borderRadius: 12, overflow: 'visible' },
  primaryShadow: {
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  tabs: { flexDirection: 'row', gap: 4, borderRadius: 14 },
  tabItem: { flex: 1 },
  label: { fontSize: 12, fontWeight: '600', letterSpacing: 0.24, marginBottom: 6 },
  fieldError: { fontSize: 11, fontWeight: '500', marginTop: 4 },
  prefix: {
    position: 'absolute',
    left: 14,
    top: 0,
    bottom: 0,
    textAlignVertical: 'center',
    lineHeight: 46,
    fontWeight: '600',
    fontSize: 14,
    zIndex: 1,
  },
  input: {
    fontSize: 14,
    fontWeight: '500',
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    minHeight: 46,
  },
  selectTrigger: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  selectText: { fontSize: 14, fontWeight: '500', flexShrink: 1 },
  overlay: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  sheet: {
    width: '100%',
    maxWidth: 400,
    maxHeight: '70%',
    borderRadius: 24,
    borderWidth: 1,
    padding: 12,
  },
  sheetTitle: { fontSize: 16, fontWeight: '700', padding: 10 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  track: { width: 38, height: 22, borderRadius: 11, padding: 3 },
  knob: { width: 16, height: 16, borderRadius: 8, backgroundColor: '#ffffff' },
});
