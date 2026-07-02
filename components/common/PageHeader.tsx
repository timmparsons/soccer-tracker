import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import {
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  showAvatar?: boolean;
  avatarUrl?: string | null;
  rightComponent?: React.ReactNode;
  hasNewCheers?: boolean;
  onNotificationPress?: () => void;
}

const PageHeader = ({
  title,
  subtitle,
  showAvatar = true,
  avatarUrl,
  rightComponent,
  hasNewCheers = false,
  onNotificationPress,
}: PageHeaderProps) => {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <>
      {/* Status Bar Background */}
      <View
        style={[
          styles.statusBarBg,
          { height: insets.top, backgroundColor: '#FFFFFF' },
        ]}
      />

      {/* Header Content */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>{title}</Text>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>

        {showAvatar ? (
          <View style={styles.headerRight}>
            <TouchableOpacity onPress={onNotificationPress} style={styles.bellWrapper} activeOpacity={0.7}>
              <Ionicons name='notifications-outline' size={26} color='#1a1a2e' />
              {hasNewCheers && <View style={styles.bellBadge} />}
            </TouchableOpacity>

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
  subtitle: {
    fontSize: 15,
    color: '#78909C',
    fontWeight: '600',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  bellWrapper: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: '#EF4444',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
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
