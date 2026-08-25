import InactivePlayersModal from '@/components/common/InactivePlayersModal';
import PageHeader from '@/components/common/PageHeader';
import PlayerProfileModal from '@/components/modals/PlayerProfileModal';
import { useChallengeNotifications } from '@/hooks/useChallengeNotifications';
import { useCoachTeams } from '@/hooks/useCoachTeams';
import { useInactivePlayers } from '@/hooks/useInactivePlayers';
import { useJugglingLeaderboard } from '@/hooks/useJugglingLeaderboard';
import {
  useClubTouchesLeaderboard,
  useGlobalTouchesLeaderboard,
  useTouchesLeaderboard,
} from '@/hooks/useLeaderboard';
import { useProfile } from '@/hooks/useProfile';
import { useTabataLeaderboard } from '@/hooks/useTabataLeaderboard';
import { useTeam } from '@/hooks/useTeam';
import { useUser } from '@/hooks/useUser';
import { recordWeeklyWin } from '@/lib/checkBadges';
import { computeRankAndDeficit } from '@/lib/leaderboardRank';
import { supabase } from '@/lib/supabase';
import { getLocalDate } from '@/utils/getLocalDate';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import JugglingHighScoresView from './JugglingHighScoresView';
import StickyRankBanner from './StickyRankBanner';
import Switcher, { CompeteView } from './Switcher';
import TabataHighScoresView from './TabataHighScoresView';
import TouchesScopeSwitcher, { TouchesScope } from './TouchesScopeSwitcher';
import WeeklyTouchesView from './WeeklyTouchesView';

const Leaderboard = ({ hideHeader = false }: { hideHeader?: boolean }) => {
  const { data: user } = useUser();
  const { data: profile, refetch: refetchProfile } = useProfile(user?.id);
  const challengeNotifications = useChallengeNotifications();
  const { data: team } = useTeam(user?.id);

  const [activeView, setActiveView] = useState<CompeteView>('touches');
  const [touchesScope, setTouchesScope] = useState<TouchesScope>('team');
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [teamPickerVisible, setTeamPickerVisible] = useState(false);
  const [switchingTeam, setSwitchingTeam] = useState(false);
  const [inactiveModalVisible, setInactiveModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const { data: coachTeams = [] } = useCoachTeams(
    profile?.is_coach ? user?.id : undefined,
  );
  const { data: inactivePlayers = [] } = useInactivePlayers(
    profile?.is_coach ? profile?.team_id : null,
  );

  const effectiveTeamId = profile?.team_id ?? undefined;
  const clubId = profile?.club_id ?? undefined;
  const activeTeamData = coachTeams.find((t) => t.id === effectiveTeamId);
  const seasonStartDate =
    activeTeamData?.season_start_date ?? team?.season_start_date ?? null;
  const displayTeamName = activeTeamData?.name ?? team?.name ?? 'My Team';

  const handleSwitchTeam = async (teamId: string) => {
    if (!user?.id || teamId === profile?.team_id) {
      setTeamPickerVisible(false);
      return;
    }
    setSwitchingTeam(true);
    await supabase
      .from('profiles')
      .update({ team_id: teamId })
      .eq('id', user.id);
    await refetchProfile();
    setSwitchingTeam(false);
    setTeamPickerVisible(false);
  };

  const lastWeekStart = useMemo(() => {
    const now = new Date();
    const thisSunday = new Date(now);
    thisSunday.setDate(now.getDate() - now.getDay());
    const lastSunday = new Date(thisSunday);
    lastSunday.setDate(thisSunday.getDate() - 7);
    return getLocalDate(lastSunday);
  }, []);

  const {
    data: touchesLeaderboard = [],
    isLoading: touchesLoading,
    refetch: refetchTouches,
  } = useTouchesLeaderboard(effectiveTeamId, seasonStartDate);

  const {
    data: clubTouchesLeaderboard = [],
    isLoading: clubTouchesLoading,
    refetch: refetchClubTouches,
  } = useClubTouchesLeaderboard(clubId, seasonStartDate, touchesScope === 'club');

  const {
    data: globalTouchesLeaderboard = [],
    isLoading: globalTouchesLoading,
    refetch: refetchGlobalTouches,
  } = useGlobalTouchesLeaderboard(seasonStartDate, touchesScope === 'global');

  const activeTouchesLeaderboard =
    touchesScope === 'club'
      ? clubTouchesLeaderboard
      : touchesScope === 'global'
        ? globalTouchesLeaderboard
        : touchesLeaderboard;
  const activeTouchesLoading =
    touchesScope === 'club'
      ? clubTouchesLoading
      : touchesScope === 'global'
        ? globalTouchesLoading
        : touchesLoading;

  const {
    data: tabataLeaderboard = [],
    isLoading: tabataLoading,
    refetch: refetchTabata,
  } = useTabataLeaderboard(effectiveTeamId);

  const {
    data: jugglingLeaderboard = [],
    isLoading: jugglingLoading,
    refetch: refetchJuggling,
  } = useJugglingLeaderboard(effectiveTeamId);

  useEffect(() => {
    if (!touchesLeaderboard.length || !user?.id) return;
    const lastWeekWinner = [...touchesLeaderboard].sort(
      (a, b) => b.last_week_touches - a.last_week_touches,
    )[0];
    if (lastWeekWinner.last_week_touches > 0) {
      recordWeeklyWin(lastWeekStart, lastWeekWinner.id, user.id);
    }
  }, [touchesLeaderboard, user?.id, lastWeekStart]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      refetchTouches(),
      touchesScope === 'club' ? refetchClubTouches() : Promise.resolve(),
      touchesScope === 'global' ? refetchGlobalTouches() : Promise.resolve(),
      refetchTabata(),
      refetchJuggling(),
    ]);
    setRefreshing(false);
  };

  useFocusEffect(
    useCallback(() => {
      refetchProfile();
      refetchTouches();
      if (touchesScope === 'club') refetchClubTouches();
      if (touchesScope === 'global') refetchGlobalTouches();
      refetchTabata();
      refetchJuggling();
    }, [
      refetchProfile,
      refetchTouches,
      touchesScope,
      refetchClubTouches,
      refetchGlobalTouches,
      refetchTabata,
      refetchJuggling,
    ]),
  );

  const rankBanner = useMemo(() => {
    if (activeView === 'touches') {
      const result = computeRankAndDeficit(
        activeTouchesLeaderboard,
        user?.id,
        'weekly_touches',
      );
      return result && { ...result, unitLabel: 'touches to pass' };
    }
    if (activeView === 'tabata') {
      const result = computeRankAndDeficit(
        tabataLeaderboard,
        user?.id,
        'max_reps',
      );
      return result && { ...result, unitLabel: 'reps to pass' };
    }
    const result = computeRankAndDeficit(
      jugglingLeaderboard,
      user?.id,
      'high_score',
    );
    return result && { ...result, unitLabel: 'juggles to pass' };
  }, [activeView, activeTouchesLeaderboard, tabataLeaderboard, jugglingLeaderboard, user?.id]);

  return (
    <View style={styles.container}>
      {!hideHeader && (
        <PageHeader
          title='Compete'
          showAvatar={true}
          avatarUrl={profile?.avatar_url}
          hasNewCheers={profile?.is_coach ? inactivePlayers.length > 0 : false}
          onNotificationPress={
            profile?.is_coach ? () => setInactiveModalVisible(true) : undefined
          }
          challengeNotifications={challengeNotifications}
        />
      )}

      <View style={styles.controlsRow}>
        <Switcher active={activeView} onChange={setActiveView} />
      </View>

      {activeView === 'touches' && (
        <View style={styles.scopeRow}>
          <TouchesScopeSwitcher
            active={touchesScope}
            onChange={setTouchesScope}
            clubEnabled={!!clubId}
          />
        </View>
      )}

      {profile?.is_coach && coachTeams.length > 1 && (
        <TouchableOpacity
          style={styles.teamPickerPill}
          onPress={() => setTeamPickerVisible(true)}
          activeOpacity={0.7}
        >
          <Text style={styles.teamPickerText}>{displayTeamName}</Text>
          <Ionicons name='chevron-down' size={14} color='#6B7280' />
        </TouchableOpacity>
      )}

      <Modal
        transparent
        visible={teamPickerVisible}
        animationType='slide'
        onRequestClose={() => setTeamPickerVisible(false)}
      >
        <TouchableOpacity
          style={styles.pickerOverlay}
          activeOpacity={1}
          onPress={() => setTeamPickerVisible(false)}
        >
          <View style={styles.pickerSheet}>
            <Text style={styles.pickerTitle}>Select Team</Text>
            {coachTeams.map((t) => (
              <TouchableOpacity
                key={t.id}
                style={[
                  styles.pickerRow,
                  t.id === effectiveTeamId && styles.pickerRowActive,
                ]}
                onPress={() => handleSwitchTeam(t.id)}
                disabled={switchingTeam}
              >
                <Text
                  style={[
                    styles.pickerRowText,
                    t.id === effectiveTeamId && styles.pickerRowTextActive,
                  ]}
                >
                  {t.name}
                </Text>
                {switchingTeam && t.id !== effectiveTeamId ? (
                  <ActivityIndicator size='small' color='#1f89ee' />
                ) : t.id === effectiveTeamId ? (
                  <Ionicons name='checkmark' size={18} color='#1f89ee' />
                ) : null}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          rankBanner ? styles.contentWithBanner : undefined,
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor='#1f89ee'
          />
        }
      >
        {!effectiveTeamId ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateTitle}>No Team Yet</Text>
            <Text style={styles.emptyStateText}>
              Join a team to see how you stack up against your teammates.
            </Text>
          </View>
        ) : activeView === 'touches' && touchesScope === 'club' && !clubId ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateTitle}>No Club Yet</Text>
            <Text style={styles.emptyStateText}>
              Join a club to see how you stack up against other teams.
            </Text>
          </View>
        ) : activeView === 'touches' ? (
          <WeeklyTouchesView
            players={activeTouchesLeaderboard}
            isLoading={activeTouchesLoading}
            currentUserId={user?.id}
            onSelectPlayer={setSelectedPlayerId}
          />
        ) : activeView === 'tabata' ? (
          <TabataHighScoresView
            records={tabataLeaderboard}
            isLoading={tabataLoading}
            currentUserId={user?.id}
            onSelectPlayer={setSelectedPlayerId}
          />
        ) : (
          <JugglingHighScoresView
            players={jugglingLeaderboard}
            isLoading={jugglingLoading}
            currentUserId={user?.id}
            onSelectPlayer={setSelectedPlayerId}
          />
        )}
      </ScrollView>

      {rankBanner && (
        <StickyRankBanner
          rank={rankBanner.rank}
          deficit={rankBanner.deficit}
          unitLabel={rankBanner.unitLabel}
        />
      )}

      <PlayerProfileModal
        playerId={selectedPlayerId}
        visible={!!selectedPlayerId}
        onClose={() => setSelectedPlayerId(null)}
        showBadges={true}
      />

      <InactivePlayersModal
        visible={inactiveModalVisible}
        onClose={() => setInactiveModalVisible(false)}
        players={inactivePlayers}
      />
    </View>
  );
};

export default Leaderboard;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
  },
  contentWithBanner: {
    paddingBottom: 80,
  },
  controlsRow: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 10,
    backgroundColor: '#FFFFFF',
  },
  scopeRow: {
    paddingHorizontal: 20,
    paddingBottom: 10,
    backgroundColor: '#FFFFFF',
  },
  teamPickerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    marginHorizontal: 20,
    marginBottom: 4,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  teamPickerText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6B7280',
  },
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  pickerSheet: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
    gap: 4,
  },
  pickerTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#78909C',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  pickerRowActive: {
    backgroundColor: '#EBF4FF',
  },
  pickerRowText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a2e',
  },
  pickerRowTextActive: {
    color: '#1f89ee',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#2C3E50',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyStateText: {
    fontSize: 15,
    color: '#78909C',
    textAlign: 'center',
    lineHeight: 22,
    fontWeight: '500',
  },
});
