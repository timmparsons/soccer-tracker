import NotificationBell, { ChallengeNotificationItem } from '@/components/common/NotificationBell';
import { HERO_BG } from '@/constants/colors';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React, { useCallback } from 'react';
import { Image, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export type { ChallengeNotificationItem };

interface PageHeaderProps {
  title: string;
  titleAccent?: string; // second title line with an underline swoosh
  subtitle?: string;
  showAvatar?: boolean;
  avatarUrl?: string | null;
  rightComponent?: React.ReactNode;
  hasNewCheers?: boolean;
  onNotificationPress?: () => void;
  challengeNotifications?: ChallengeNotificationItem[];
  dark?: boolean;
}

const PageHeader = ({
  title,
  titleAccent,
  subtitle,
  showAvatar = true,
  avatarUrl,
  rightComponent,
  hasNewCheers,
  onNotificationPress,
  challengeNotifications,
  dark = false,
}: PageHeaderProps) => {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Light status bar over the dark header, restored when leaving the screen
  useFocusEffect(
    useCallback(() => {
      if (!dark) return;
      StatusBar.setBarStyle('light-content', true);
      return () => StatusBar.setBarStyle('dark-content', true);
    }, [dark]),
  );

  return (
    <>
      {/* Status Bar Background */}
      <View
        style={[
          styles.statusBarBg,
          { height: insets.top, backgroundColor: dark ? HERO_BG : '#FFFFFF' },
        ]}
      />

      {/* Header Content */}
      <View style={[styles.header, dark && styles.headerDark]}>
        <View style={styles.headerLeft}>
          <Text style={[styles.title, dark && styles.titleDark]}>{title}</Text>
          {titleAccent && (
            <View style={styles.accentWrap}>
              <Text style={[styles.titleAccent, dark && styles.titleDark]} numberOfLines={1} adjustsFontSizeToFit>
                {titleAccent}
              </Text>
              <View style={[styles.accentUnderline, dark && styles.accentUnderlineDark]} />
            </View>
          )}
          {subtitle && <Text style={[styles.subtitle, dark && styles.subtitleDark]}>{subtitle}</Text>}
        </View>

        {showAvatar ? (
          <View style={styles.headerRight}>
            <NotificationBell
              hasNewCheers={hasNewCheers}
              onNotificationPress={onNotificationPress}
              challengeNotifications={challengeNotifications}
              color={dark ? '#FFFFFF' : '#1a1a2e'}
            />

            <TouchableOpacity onPress={() => router.push('/profile')}>
              <View style={styles.avatarGlow} />
              <Image
                source={{
                  uri:
                    avatarUrl ||
                    'https://cdn-icons-png.flaticon.com/512/4140/4140037.png',
                }}
                style={styles.avatar}
              />
            </TouchableOpacity>
          </View>
        ) : (
          rightComponent
        )}
      </View>
    </>
  );
};

export default PageHeader;

const styles = StyleSheet.create({
  statusBarBg: {
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
  },
  headerDark: {
    backgroundColor: HERO_BG,
  },
  headerLeft: {
    flex: 1,
    marginRight: 15,
  },
  title: {
    fontSize: 26,
    fontWeight: '900',
    color: '#1a1a2e',
    marginBottom: 2,
  },
  titleDark: {
    color: '#FFFFFF',
  },
  accentWrap: {
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  titleAccent: {
    fontSize: 26,
    fontWeight: '900',
    color: '#1a1a2e',
  },
  accentUnderline: {
    height: 3,
    width: '85%',
    borderRadius: 2,
    marginTop: 2,
    backgroundColor: '#1f89ee',
    transform: [{ rotate: '-2deg' }],
  },
  accentUnderlineDark: {
    backgroundColor: '#FFFFFF',
  },
  subtitle: {
    fontSize: 15,
    color: '#78909C',
    fontWeight: '600',
  },
  subtitleDark: {
    color: 'rgba(255,255,255,0.9)',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatarGlow: {
    position: 'absolute',
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    borderRadius: 35,
    backgroundColor: '#1f89ee',
    opacity: 0.3,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 4,
    borderColor: '#FFF',
  },
});
