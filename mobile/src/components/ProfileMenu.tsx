import React, { useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { IconBox } from '@/components/Card';
import { Switch } from '@/components/controls';
import { ChevronDownIcon, LogoutIcon, MoonIcon, UserIcon } from '@/components/FinanceIcons';
import { useTheme } from '@/context/ThemeContext';

/**
 * Port of Dashboard/ProfileMenu: avatar "Profile ▾" pill opening a dropdown
 * with name/email, View Profile, the Dark Mode switch and Logout. Rendered in
 * a transparent Modal anchored under the pill so it floats above the page,
 * like the web's absolutely-positioned .dropdown-menu.
 */
export const ProfileMenu: React.FC<{
  name: string;
  email?: string | null;
  photoURL?: string | null;
  onViewProfile: () => void;
  onLogout: () => void;
}> = ({ name, email, photoURL, onViewProfile, onLogout }) => {
  const { palette, mode, setModePreference } = useTheme();
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState({ top: 0, right: 16 });
  const ref = useRef<React.ComponentRef<typeof View>>(null);

  const openMenu = () => {
    ref.current?.measureInWindow((x, y, w, h) => {
      setAnchor({ top: y + h + 10, right: 16 });
      setOpen(true);
    });
  };

  return (
    <>
      <Pressable
        ref={ref}
        onPress={openMenu}
        accessibilityLabel="Profile menu"
        accessibilityState={{ expanded: open }}
        style={[styles.pill, { backgroundColor: palette.glassBg, borderColor: `${palette.primary}33` }]}
      >
        {photoURL ? (
          <Image source={{ uri: photoURL }} style={styles.photo} />
        ) : (
          <IconBox size={30} radius={15}>
            <Text style={styles.initial}>{name.charAt(0).toUpperCase()}</Text>
          </IconBox>
        )}
        <Text style={[styles.pillText, { color: palette.textPrimary }]}>Profile</Text>
        <View style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }}>
          <ChevronDownIcon size={12} color={palette.textTertiary} />
        </View>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => setOpen(false)}>
          <Pressable
            onPress={() => {}}
            style={[
              styles.menu,
              { top: anchor.top, right: anchor.right, backgroundColor: palette.modalBg, borderColor: palette.modalBorder },
            ]}
          >
            <View style={[styles.menuHeader, { borderBottomColor: palette.inputBorder }]}>
              <Text style={[styles.menuName, { color: palette.textPrimary }]}>{name}</Text>
              {email ? (
                <Text style={[styles.menuEmail, { color: palette.textSecondary }]} numberOfLines={1}>
                  {email}
                </Text>
              ) : null}
            </View>

            <Pressable
              style={({ pressed }) => [styles.item, pressed && { backgroundColor: palette.glassBg }]}
              onPress={() => {
                setOpen(false);
                onViewProfile();
              }}
            >
              <View style={styles.itemLeft}>
                <UserIcon size={14} color={palette.textPrimary} />
                <Text style={[styles.itemText, { color: palette.textPrimary }]}>View Profile</Text>
              </View>
            </Pressable>

            <View style={styles.item}>
              <View style={styles.itemLeft}>
                <MoonIcon size={14} color={palette.textPrimary} />
                <Text style={[styles.itemText, { color: palette.textPrimary }]}>Dark Mode</Text>
              </View>
              <Switch
                value={mode === 'dark'}
                onChange={(v) => setModePreference(v ? 'dark' : 'light')}
                label="Toggle dark mode"
              />
            </View>

            <Pressable
              style={({ pressed }) => [styles.item, pressed && { backgroundColor: palette.glassBg }]}
              onPress={() => {
                setOpen(false);
                onLogout();
              }}
            >
              <View style={styles.itemLeft}>
                <LogoutIcon size={14} color={palette.danger} />
                <Text style={[styles.itemText, { color: palette.danger }]}>Logout</Text>
              </View>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    paddingLeft: 6,
    paddingRight: 12,
    borderRadius: 999,
    borderWidth: 1,
  },
  photo: { width: 30, height: 30, borderRadius: 15 },
  initial: { color: '#ffffff', fontSize: 13, fontWeight: '700' },
  pillText: { fontSize: 13, fontWeight: '600' },
  menu: {
    position: 'absolute',
    minWidth: 240,
    borderRadius: 16,
    borderWidth: 1,
    padding: 6,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 12,
  },
  menuHeader: { paddingTop: 10, paddingHorizontal: 12, paddingBottom: 12, borderBottomWidth: 1, marginBottom: 6 },
  menuName: { fontSize: 13, fontWeight: '700' },
  menuEmail: { fontSize: 12, marginTop: 2 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  itemLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  itemText: { fontSize: 13, fontWeight: '500' },
});
