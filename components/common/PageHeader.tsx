import { Ionicons } from '@expo/vector-icons';
import { markReactionsViewed, useAllMyRecentCheers, useUnviewedReactions } from '@/hooks/useActivityReactions';
import { useUser } from '@/hooks/useUser';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Image,
  Modal,
  Pressable,
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
  hasNewCheers: hasNewCheersOverride,
  onNotificationPress,
}: PageHeaderProps) => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { data: user } = useUser();
  const [showCheersModal, setShowCheersModal] = useState(false);

  const isExternalHandler = !!onNotificationPress;
  const { data: unviewedReactions = [] } = useUnviewedReactions(isExternalHandler ? undefined : user?.id);
  const { data: allCheers = [] } = useAllMyRecentCheers(isExternalHandler ? undefined : user?.id);

  const hasNewCheers = isExternalHandler
    ? (hasNewCheersOverride ?? false)
    : unviewedReactions.length > 0;

  const handleBellPress = async () => {
    if (onNotificationPress) {
      onNotificationPress();
      return;
    }
    setShowCheersModal(true);
    await markReactionsViewed([]);
    queryClient.invalidateQueries({ queryKey: ['activity-reactions-unviewed', user?.id] });
    queryClient.invalidateQueries({ queryKey: ['all-my-cheers', user?.id] });
  };

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
            <TouchableOpacity onPress={handleBellPress} style={styles.bellWrapper} activeOpacity={0.7}>
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

      {/* Cheers Modal */}
      <Modal visible={showCheersModal} transparent animationType='slide' onRequestClose={() => setShowCheersModal(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowCheersModal(false)}>
          <Pressable style={styles.modalSheet} onPress={() => {}}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Cheers</Text>
            {allCheers.length === 0 && (
              <Text style={styles.modalEmpty}>No cheers yet — get out there and train!</Text>
            )}
            {allCheers.map((r) => (
              <View key={r.id} style={styles.modalRow}>
                <View style={styles.modalAvatar}>
                  <Text style={styles.modalAvatarText}>
                    {r.reactor_name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.modalRowText}>
                  <Text style={styles.modalName}>{r.reactor_name}</Text>
                  <Text style={styles.modalActivity}>cheered {r.activity_label}</Text>
                </View>
                {r.is_new && <View style={styles.modalNewDot} />}
              </View>
            ))}
            <TouchableOpacity style={styles.modalDismissBtn} onPress={() => setShowCheersModal(false)}>
              <Text style={styles.modalDismissText}>Close</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
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
  // CHEERS MODAL
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 40,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E5E7EB',
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1a1a2e',
    marginBottom: 20,
  },
  modalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F4F8',
  },
  modalAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalAvatarText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#1f89ee',
  },
  modalRowText: {
    flex: 1,
  },
  modalName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1a1a2e',
  },
  modalActivity: {
    fontSize: 12,
    fontWeight: '600',
    color: '#78909C',
    marginTop: 2,
  },
  modalNewDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
  modalEmpty: {
    fontSize: 14,
    fontWeight: '600',
    color: '#78909C',
    textAlign: 'center',
    paddingVertical: 24,
  },
  modalDismissBtn: {
    marginTop: 24,
    backgroundColor: '#1f89ee',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  modalDismissText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF',
  },
});
