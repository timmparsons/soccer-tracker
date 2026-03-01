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
}

const PageHeader = ({
  title,
  subtitle,
  showAvatar = true,
  avatarUrl,
  rightComponent,
}: PageHeaderProps) => {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <>
      {/* Status Bar Background */}
      <View
        style={[
          styles.statusBarBg,
          { height: insets.top, backgroundColor: '#F5F7FA' },
        ]}
      />

      {/* Header Content */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>{title}</Text>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>

        {showAvatar ? (
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
    backgroundColor: '#F5F7FA',
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
