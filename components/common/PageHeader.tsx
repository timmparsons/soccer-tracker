import { Ionicons } from '@expo/vector-icons';
import { CheerNotification, markReactionsViewed, useAllMyRecentCheers, useUnviewedReactions } from '@/hooks/useActivityReactions';
import { useUser } from '@/hooks/useUser';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Dimensions,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return mins <= 1 ? 'Just now' : `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function activityIcon(type: CheerNotification['activity_type']): { name: React.ComponentProps<typeof Ionicons>['name']; color: string; bg: string } {
  switch (type) {
    case 'win': return { name: 'trophy', color: '#F59E0B', bg: '#FEF3C7' };
    case 'street': return { name: 'flash', color: '#8B5CF6', bg: '#EDE9FE' };
    default: return { name: 'football', color: '#1f89ee', bg: '#EFF6FF' };
  }
}

export interface ChallengeNotificationItem {
  id: string;
  title: string;
  subtitle: string;
  onPress: () => void;
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  showAvatar?: boolean;
  avatarUrl?: string | null;
  rightComponent?: React.ReactNode;
  hasNewCheers?: boolean;
  onNotificationPress?: () => void;
  challengeNotifications?: ChallengeNotificationItem[];
}

const PageHeader = ({
  title,
  subtitle,
  showAvatar = true,
  avatarUrl,
  rightComponent,
  hasNewCheers: hasNewCheersOverride,
  onNotificationPress,
  challengeNotifications,
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
    : unviewedReactions.length > 0 || (challengeNotifications?.length ?? 0) > 0;

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
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback onPress={() => setShowCheersModal(false)}>
            <View style={styles.modalBackdrop} />
          </TouchableWithoutFeedback>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Notifications</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Challenge notifications */}
              {challengeNotifications && challengeNotifications.length > 0 && (
                <>
                  {allCheers.length > 0 && <Text style={styles.sectionLabel}>Challenges</Text>}
                  {challengeNotifications.map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      style={styles.modalRow}
                      onPress={() => {
                        setShowCheersModal(false);
                        item.onPress();
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.modalAvatar, { backgroundColor: '#FEE2E2' }]}>
                        <Ionicons name='alert-circle' size={20} color='#EF4444' />
                      </View>
                      <View style={styles.modalRowText}>
                        <View style={styles.modalNameRow}>
                          <Text style={styles.modalName}>{item.title}</Text>
                          <View style={styles.modalNewDot} />
                        </View>
                        <Text style={styles.modalActivity}>{item.subtitle}</Text>
                      </View>
                      <Ionicons name='chevron-forward' size={16} color='#B0BEC5' />
                    </TouchableOpacity>
                  ))}
                </>
              )}
              {/* Cheers */}
              {allCheers.length > 0 && challengeNotifications && challengeNotifications.length > 0 && (
                <Text style={styles.sectionLabel}>Cheers</Text>
              )}
              {allCheers.length === 0 && (challengeNotifications?.length ?? 0) === 0 && (
                <Text style={styles.modalEmpty}>No notifications yet — get out there and train!</Text>
              )}
              {allCheers.map((r) => {
                const icon = activityIcon(r.activity_type);
                return (
                  <View key={r.id} style={styles.modalRow}>
                    <View style={[styles.modalAvatar, { backgroundColor: '#EFF6FF' }]}>
                      <Text style={styles.modalAvatarText}>
                        {r.reactor_name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.modalRowText}>
                      <View style={styles.modalNameRow}>
                        <Text style={styles.modalName}>
                          {r.reactor_name}
                          <Text style={styles.modalVerb}> cheered you on 👏</Text>
                        </Text>
                        {r.is_new && <View style={styles.modalNewDot} />}
                      </View>
                      <View style={styles.modalActivityRow}>
                        <View style={[styles.modalActivityIcon, { backgroundColor: icon.bg }]}>
                          <Ionicons name={icon.name} size={11} color={icon.color} />
                        </View>
                        <Text style={styles.modalActivity}>{r.activity_label}</Text>
                      </View>
                    </View>
                    <Text style={styles.modalTime}>{timeAgo(r.created_at)}</Text>
                  </View>
                );
              })}
            </ScrollView>
            <TouchableOpacity style={styles.modalDismissBtn} onPress={() => setShowCheersModal(false)}>
              <Text style={styles.modalDismissText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
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
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 40,
    maxHeight: Dimensions.get('window').height * 0.7,
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
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#78909C',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: 8,
    marginBottom: 4,
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
  modalNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  modalName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1a1a2e',
  },
  modalVerb: {
    fontWeight: '500',
  },
  modalActivityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 3,
  },
  modalActivityIcon: {
    width: 18,
    height: 18,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalActivity: {
    fontSize: 12,
    fontWeight: '600',
    color: '#78909C',
    flexShrink: 1,
  },
  modalNewDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
  modalTime: {
    fontSize: 11,
    fontWeight: '600',
    color: '#B0BEC5',
    marginLeft: 8,
    flexShrink: 0,
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
