import PageHeader from '@/components/common/PageHeader';
import BadgeEarnedModal from '@/components/modals/BadgeEarnedModal';
import GameSpeedModal from '@/components/modals/GameSpeedModal';
import LogSessionModal from '@/components/modals/LogSessionModal';
import VinnieCelebrationModal from '@/components/modals/VinnieCelebrationModal';
import { useDrillPersonalBests, useSaveDrillAttempt } from '@/hooks/useDrillAttempts';
import { useDrillLeaderboard } from '@/hooks/useDrillLeaderboard';
import { useChallengeOfTheDay, type ChallengeOfTheDay } from '@/hooks/useChallengeOfTheDay';
import { useAllBadges } from '@/hooks/useBadges';
import { useProfile } from '@/hooks/useProfile';
import { useSendChallenge } from '@/hooks/usePlayerChallenges';
import { useDrills, useTouchTracking } from '@/hooks/useTouchTracking';
import { useTeamPlayers } from '@/hooks/useTeamPlayers';
import { useUser } from '@/hooks/useUser';
import { checkAndAwardBadges } from '@/lib/checkBadges';
import { checkAndAwardWeeklyChallenge } from '@/lib/checkTeamBadges';
import { createFeedEvent } from '@/lib/feedEvents';
import { supabase } from '@/lib/supabase';
import { formatTime } from '@/utils/formatTime';
import { getDisplayName } from '@/utils/getDisplayName';
import { useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

interface Drill {
  id: string;
  name: string;
  difficulty_level: string;
  description?: string | null;
  video_url?: string | null;
  thumbnail_url?: string | null;
}

const CATEGORY_NAMES: Record<string, string> = {
  beginner: 'Ball Mastery',
  intermediate: 'Turns & Control',
  advanced: 'Skill Moves',
};

const TOUCH_TARGETS = [100, 200, 300, 500];

// DRILL CARD

function DrillCard({
  drill,
  personalBest,
  teamRank,
  onStart,
}: {
  drill: Drill;
  personalBest: number | null;
  teamRank: number | null;
  onStart: () => void;
}) {
  return (
    <View style={styles.drillCard}>
      {drill.thumbnail_url ? (
        <Image source={{ uri: drill.thumbnail_url }} style={styles.drillThumb} />
      ) : (
        <View style={[styles.drillThumb, styles.drillThumbPlaceholder]}>
          <View style={styles.playTriangle} />
        </View>
      )}
      <View style={styles.drillInfo}>
        <Text style={styles.drillName}>{drill.name}</Text>
        <View style={styles.drillMeta}>
          {personalBest != null ? (
            <Text style={styles.drillPb}>Best: {formatTime(personalBest)} · 100 touches</Text>
          ) : (
            <Text style={styles.drillNoPb}>No attempts yet</Text>
          )}
          {teamRank != null && (
            <Text style={styles.drillRank}>#{teamRank} on team</Text>
          )}
        </View>
      </View>
      <TouchableOpacity style={styles.startBtn} onPress={onStart} activeOpacity={0.8}>
        <Text style={styles.startBtnText}>START</Text>
      </TouchableOpacity>
    </View>
  );
}

// DRILL LEADERBOARD ENTRY (mini, used in detail view)

function LeaderboardSnippet({
  drillId,
  target,
  teamId,
  userId,
}: {
  drillId: string;
  target: number;
  teamId: string | undefined;
  userId: string;
}) {
  const { data: board = [] } = useDrillLeaderboard(drillId, target, teamId);
  if (!board.length) return null;
  const top3 = board.slice(0, 3);

  return (
    <View style={styles.miniBoard}>
      {top3.map((e) => (
        <View key={e.user_id} style={[styles.miniBoardRow, e.user_id === userId && styles.miniBoardRowMe]}>
          <Text style={styles.miniBoardRank}>#{e.rank}</Text>
          <Text style={styles.miniBoardName} numberOfLines={1}>{e.user_id === userId ? 'You' : e.name}</Text>
          <Text style={styles.miniBoardTime}>{formatTime(e.best_time)}</Text>
        </View>
      ))}
    </View>
  );
}

// CHALLENGE OF THE DAY CARD

const trainStyles = StyleSheet.create({
  cotdCard: {
    backgroundColor: '#1a1a2e',
    borderRadius: 20,
    padding: 18,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 6,
  },
  cotdHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  cotdLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffb724',
    letterSpacing: 1,
  },
  cotdDonePill: {
    backgroundColor: 'rgba(49,175,77,0.2)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  cotdDoneText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#31af4d',
  },
  cotdDrill: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 14,
  },
  cotdBoard: {
    gap: 8,
    marginBottom: 14,
  },
  cotdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cotdMedal: {
    fontSize: 14,
    width: 20,
  },
  cotdAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#2d2d4e',
  },
  cotdName: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.85)',
  },
  cotdNameMe: {
    color: '#1f89ee',
  },
  cotdTime: {
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.55)',
  },
  cotdEmpty: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.45)',
    marginBottom: 14,
  },
  cotdButton: {
    backgroundColor: '#ffb724',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  cotdButtonText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#1a1a2e',
    letterSpacing: 0.5,
  },
});

function CotdCard({
  cotd,
  currentUserId,
  onTrain,
}: {
  cotd: ChallengeOfTheDay;
  currentUserId: string;
  onTrain: () => void;
}) {
  const top3 = cotd.entries.slice(0, 3);
  const iDone = cotd.entries.some((e) => e.user_id === currentUserId);
  const medals = ['🥇', '🥈', '🥉'];

  return (
    <Pressable style={trainStyles.cotdCard} onPress={onTrain}>
      <View style={trainStyles.cotdHeader}>
        <Text style={trainStyles.cotdLabel}>CHALLENGE OF THE DAY</Text>
        {iDone && (
          <View style={trainStyles.cotdDonePill}>
            <Text style={trainStyles.cotdDoneText}>Done</Text>
          </View>
        )}
      </View>
      <Text style={trainStyles.cotdDrill}>
        {cotd.touches_target} {cotd.drill_name}
      </Text>
      {top3.length > 0 ? (
        <View style={trainStyles.cotdBoard}>
          {top3.map((e, i) => {
            const isMe = e.user_id === currentUserId;
            return (
              <View key={e.user_id} style={trainStyles.cotdRow}>
                <Text style={trainStyles.cotdMedal}>{medals[i]}</Text>
                <Image
                  source={{ uri: e.avatar_url ?? 'https://cdn-icons-png.flaticon.com/512/4140/4140037.png' }}
                  style={trainStyles.cotdAvatar}
                />
                <Text style={[trainStyles.cotdName, isMe && trainStyles.cotdNameMe]} numberOfLines={1}>
                  {isMe ? 'You' : e.name}
                </Text>
                <Text style={trainStyles.cotdTime}>{formatTime(e.time_seconds)}</Text>
              </View>
            );
          })}
        </View>
      ) : (
        <Text style={trainStyles.cotdEmpty}>No one has done it yet — be first!</Text>
      )}
      <View style={trainStyles.cotdButton}>
        <Text style={trainStyles.cotdButtonText}>{iDone ? 'BEAT YOUR TIME' : 'TRAIN NOW'}</Text>
      </View>
    </Pressable>
  );
}

// MAIN COMPONENT

type ModalStep = 'detail' | 'timer' | 'results' | 'challenge-picker';

const TrainPage = () => {
  const { data: user } = useUser();
  const { data: profile } = useProfile(user?.id);
  const { data: touchStats } = useTouchTracking(user?.id);
  const { data: drills = [], isLoading: drillsLoading, refetch: refetchDrills } = useDrills();
  const { data: personalBests = [], refetch: refetchPBs } = useDrillPersonalBests(user?.id);
  const { data: allBadges = [] } = useAllBadges();
  const { mutateAsync: saveDrillAttempt } = useSaveDrillAttempt();
  const { data: cotd } = useChallengeOfTheDay(profile?.team_id ?? undefined);
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  // Drill modal state
  const [selectedDrill, setSelectedDrill] = useState<Drill | null>(null);
  const [selectedTarget, setSelectedTarget] = useState<number>(100);
  const [modalStep, setModalStep] = useState<ModalStep>('detail');

  // Timer state
  const [elapsedMs, setElapsedMs] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const accumulatedMsRef = useRef<number>(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerStarted, setTimerStarted] = useState(false);

  // Results state
  const [resultTime, setResultTime] = useState(0);
  const [resultIsPb, setResultIsPb] = useState(false);
  const [resultPrevBest, setResultPrevBest] = useState<number | null>(null);

  // Legacy modals
  const [showLogModal, setShowLogModal] = useState(false);
  const [showGameSpeed, setShowGameSpeed] = useState(false);
  const [showVinnie, setShowVinnie] = useState(false);
  const [celebrationTouches, setCelebrationTouches] = useState(0);
  const [earnedBadges, setEarnedBadges] = useState<string[]>([]);
  const [showBadgeModal, setShowBadgeModal] = useState(false);

  const { drillId: paramDrillId } = useLocalSearchParams<{ drillId?: string }>();
  const autoOpenedRef = useRef<string | null>(null);

  // Auto-open timer when navigated from Challenge of the Day
  useEffect(() => {
    if (!paramDrillId || !drills.length) return;
    if (autoOpenedRef.current === paramDrillId) return;
    const drill = drills.find((d) => d.id === paramDrillId);
    if (!drill) return;
    autoOpenedRef.current = paramDrillId;
    setSelectedDrill(drill);
    setSelectedTarget(100);
    accumulatedMsRef.current = 0;
    setElapsedMs(0);
    setTimerRunning(false);
    setTimerStarted(false);
    setModalStep('timer');
  }, [paramDrillId, drills]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchDrills(), refetchPBs()]);
    setRefreshing(false);
  }, [refetchDrills, refetchPBs]);

  useEffect(() => {
    if (timerRunning) {
      timerRef.current = setInterval(() => {
        setElapsedMs(accumulatedMsRef.current + (Date.now() - startTimeRef.current));
      }, 100);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [timerRunning]);

  const handleStartDrill = (drill: Drill) => {
    setSelectedDrill(drill);
    setSelectedTarget(100);
    setModalStep('detail');
    setElapsedMs(0);
    setTimerRunning(false);
    setTimerStarted(false);
  };

  const handleCotdTrain = () => {
    if (!cotd) return;
    const drill = drills.find((d) => d.id === cotd.drill_id);
    if (!drill) return;
    setSelectedDrill(drill);
    setSelectedTarget(cotd.touches_target);
    accumulatedMsRef.current = 0;
    setElapsedMs(0);
    setTimerRunning(false);
    setTimerStarted(false);
    setModalStep('timer');
  };

  const handleBeginTimer = () => {
    accumulatedMsRef.current = 0;
    setElapsedMs(0);
    setTimerRunning(false);
    setTimerStarted(false);
    setModalStep('timer');
  };

  const handleStartTimer = () => {
    accumulatedMsRef.current = 0;
    startTimeRef.current = Date.now();
    setTimerStarted(true);
    setTimerRunning(true);
  };

  const handleToggleTimer = () => {
    if (timerRunning) {
      accumulatedMsRef.current = accumulatedMsRef.current + (Date.now() - startTimeRef.current);
      setTimerRunning(false);
    } else {
      startTimeRef.current = Date.now();
      setTimerRunning(true);
    }
  };

  const handleDone = () => {
    const finalMs = timerRunning
      ? accumulatedMsRef.current + (Date.now() - startTimeRef.current)
      : elapsedMs;
    setTimerRunning(false);
    setElapsedMs(finalMs);
    handleSaveAttempt(finalMs / 1000);
  };

  const handleSaveAttempt = async (timeSeconds: number) => {
    if (!user?.id || !selectedDrill) return;

    const prevBest = personalBests.find(
      (pb) => pb.drill_id === selectedDrill.id && pb.touches_target === selectedTarget,
    );

    let isPersonalBest = false;
    try {
      const result = await saveDrillAttempt({
        userId: user.id,
        drillId: selectedDrill.id,
        drillName: selectedDrill.name,
        touchesTarget: selectedTarget,
        timeSeconds,
        teamId: profile?.team_id ?? null,
      });
      isPersonalBest = result.isPersonalBest;

      if (touchStats && user.id) {
        const newBadges = await checkAndAwardBadges(user.id, {
          totalSessions: touchStats.total_sessions + 1,
          totalTouches: touchStats.total_touches + selectedTarget,
          currentStreak: touchStats.current_streak,
          jugglesThisSession: null,
          previousJugglePB: 0,
          durationMinutes: Math.max(1, Math.round(timeSeconds / 60)),
          sessionsThisWeek: touchStats.this_week_sessions + 1,
          teamId: profile?.team_id ?? null,
        });
        if (newBadges.length) {
          setEarnedBadges(newBadges);
          setShowBadgeModal(true);
          // Post feed events for each earned badge
          if (profile?.team_id) {
            const { data: badgeRows } = await supabase
              .from('badges')
              .select('id, name')
              .in('id', newBadges);
            for (const b of badgeRows ?? []) {
              void createFeedEvent(profile.team_id, user.id, 'badge_earned', { badge_id: b.id, badge_name: b.name });
            }
          }
        }
        if (profile?.team_id) {
          await checkAndAwardWeeklyChallenge(profile.team_id);
        }
      }
    } catch {
      // DB tables not migrated yet — still show results screen
    }

    setResultTime(timeSeconds);
    setResultIsPb(isPersonalBest);
    setResultPrevBest(prevBest?.best_time ?? null);
    setModalStep('results');
  };

  const handleCloseModal = () => {
    setSelectedDrill(null);
    setElapsedMs(0);
    setTimerRunning(false);
    setTimerStarted(false);
  };

  const handleSessionLogged = () => {
    queryClient.invalidateQueries({ queryKey: ['touch-tracking', user?.id] });
    queryClient.invalidateQueries({ queryKey: ['challenge-stats'] });
  };

  // Group drills by difficulty
  const categories = (['beginner', 'intermediate', 'advanced'] as const).filter(
    (d) => drills.some((dr) => dr.difficulty_level === d),
  );

  const elapsedSeconds = elapsedMs / 1000;
  const displayName = getDisplayName(profile);

  return (
    <View style={styles.container}>
      <PageHeader
        title="Train"
        subtitle={displayName}
        showAvatar
        avatarUrl={profile?.avatar_url}
      />

      {drillsLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1f89ee" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#1f89ee" />
          }
        >
          {cotd && (
            <CotdCard
              cotd={cotd}
              currentUserId={user?.id ?? ''}
              onTrain={handleCotdTrain}
            />
          )}
          {categories.map((difficulty) => {
            const categoryDrills = drills.filter((d) => d.difficulty_level === difficulty);
            return (
              <View key={difficulty} style={styles.categorySection}>
                <Text style={styles.categoryTitle}>{CATEGORY_NAMES[difficulty]}</Text>
                {categoryDrills.map((drill) => {
                  const pb = personalBests.find(
                    (p) => p.drill_id === drill.id && p.touches_target === 100,
                  );
                  return (
                    <DrillCard
                      key={drill.id}
                      drill={drill}
                      personalBest={pb?.best_time ?? null}
                      teamRank={null}
                      onStart={() => handleStartDrill(drill)}
                    />
                  );
                })}
              </View>
            );
          })}

          {/* GAME SPEED DRIBBLE */}
          <View style={styles.gameSpeedCard}>
            <View style={styles.gameSpeedInfo}>
              <Text style={styles.gameSpeedTitle}>Game Speed Dribble</Text>
              <Text style={styles.gameSpeedSubtitle}>
                Dribble at full game pace. Count realistic touches in 1, 2, or 3 minutes.
              </Text>
            </View>
            <TouchableOpacity style={styles.gameSpeedBtn} onPress={() => setShowGameSpeed(true)} activeOpacity={0.8}>
              <Text style={styles.gameSpeedBtnText}>START</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.logButton} onPress={() => setShowLogModal(true)}>
            <Text style={styles.logButtonText}>Log Session Manually</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* DRILL MODAL (detail → timer → results) */}
      <Modal
        visible={!!selectedDrill}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleCloseModal}
      >
        <View style={styles.modalContainer}>
          {selectedDrill && modalStep === 'detail' && (
            <DrillDetailView
              drill={selectedDrill}
              selectedTarget={selectedTarget}
              onTargetChange={setSelectedTarget}
              onStart={handleBeginTimer}
              onClose={handleCloseModal}
              userId={user?.id ?? ''}
              teamId={profile?.team_id ?? undefined}
              personalBests={personalBests}
            />
          )}

          {selectedDrill && modalStep === 'timer' && (
            <TimerView
              drillName={selectedDrill.name}
              touchesTarget={selectedTarget}
              elapsedSeconds={elapsedSeconds}
              isStarted={timerStarted}
              isRunning={timerRunning}
              onStart={handleStartTimer}
              onToggle={handleToggleTimer}
              onDone={handleDone}
              onClose={handleCloseModal}
            />
          )}

          {selectedDrill && modalStep === 'results' && (
            <ResultsView
              drillName={selectedDrill.name}
              drillId={selectedDrill.id}
              touchesTarget={selectedTarget}
              timeSeconds={resultTime}
              isPb={resultIsPb}
              prevBest={resultPrevBest}
              teamId={profile?.team_id ?? undefined}
              userId={user?.id ?? ''}
              onClose={handleCloseModal}
              onTrainAgain={() => {
                setElapsedMs(0);
                setTimerRunning(false);
                setTimerStarted(false);
                setModalStep('detail');
              }}
              onChallenge={() => setModalStep('challenge-picker')}
            />
          )}

          {selectedDrill && modalStep === 'challenge-picker' && (
            <ChallengePickerView
              drillId={selectedDrill.id}
              drillName={selectedDrill.name}
              touchesTarget={selectedTarget}
              timeSeconds={resultTime}
              teamId={profile?.team_id ?? ''}
              currentUserId={user?.id ?? ''}
              onBack={() => setModalStep('results')}
              onDone={handleCloseModal}
            />
          )}
        </View>
      </Modal>

      {/* LEGACY MODALS */}
      <LogSessionModal
        visible={showLogModal}
        onClose={() => setShowLogModal(false)}
        userId={user?.id ?? ''}
        onSuccess={handleSessionLogged}
        onSessionLogged={(_touches, _isChallenge, _drillName, badgeIds, teamBadgeIds) => {
          if (badgeIds?.length) {
            setEarnedBadges(badgeIds);
            setShowBadgeModal(true);
          }
          setCelebrationTouches(_touches);
          setShowVinnie(true);
        }}
        badgeContext={touchStats ? {
          totalSessions: touchStats.total_sessions,
          totalTouches: touchStats.total_touches,
          currentStreak: touchStats.current_streak,
          previousJugglePB: 0,
          sessionsThisWeek: touchStats.this_week_sessions,
          teamId: profile?.team_id ?? null,
        } : undefined}
        teamId={profile?.team_id ?? null}
      />

      <VinnieCelebrationModal
        visible={showVinnie}
        onClose={() => setShowVinnie(false)}
        touchCount={celebrationTouches ?? 0}
        streak={touchStats?.current_streak ?? 0}
        isChallenge={false}
      />

      <BadgeEarnedModal
        visible={showBadgeModal}
        onClose={() => setShowBadgeModal(false)}
        badges={allBadges.filter((b) => earnedBadges.includes(b.id))}
      />

      <GameSpeedModal
        visible={showGameSpeed}
        userId={user?.id ?? ''}
        teamId={profile?.team_id}
        onClose={() => setShowGameSpeed(false)}
      />
    </View>
  );
};

// SUB-VIEWS (defined outside main component to avoid re-renders)

function DrillDetailView({
  drill,
  selectedTarget,
  onTargetChange,
  onStart,
  onClose,
  userId,
  teamId,
  personalBests,
}: {
  drill: Drill;
  selectedTarget: number;
  onTargetChange: (t: number) => void;
  onStart: () => void;
  onClose: () => void;
  userId: string;
  teamId: string | undefined;
  personalBests: ReturnType<typeof useDrillPersonalBests>['data'];
}) {
  const pb = (personalBests ?? []).find(
    (p) => p.drill_id === drill.id && p.touches_target === selectedTarget,
  );

  return (
    <View style={styles.detailContainer}>
      <View style={styles.detailHeader}>
        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
          <Text style={styles.closeBtnText}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.detailTitle}>{drill.name}</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={styles.detailScroll}>
        {drill.thumbnail_url ? (
          <Image source={{ uri: drill.thumbnail_url }} style={styles.detailImage} />
        ) : (
          <View style={[styles.detailImage, styles.detailImagePlaceholder]}>
            <View style={styles.playTriangleLg} />
          </View>
        )}

        {drill.description ? (
          <Text style={styles.detailDescription}>{drill.description}</Text>
        ) : null}

        <Text style={styles.targetLabel}>Choose your target</Text>
        <View style={styles.targetRow}>
          {TOUCH_TARGETS.map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.targetBtn, selectedTarget === t && styles.targetBtnSelected]}
              onPress={() => onTargetChange(t)}
            >
              <Text style={[styles.targetBtnText, selectedTarget === t && styles.targetBtnTextSelected]}>
                {t}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {pb && (
          <View style={styles.pbRow}>
            <Text style={styles.pbLabel}>Your best</Text>
            <Text style={styles.pbValue}>{formatTime(pb.best_time)}</Text>
          </View>
        )}

        <LeaderboardSnippet
          drillId={drill.id}
          target={selectedTarget}
          teamId={teamId}
          userId={userId}
        />
      </ScrollView>

      <View style={styles.detailFooter}>
        <TouchableOpacity style={styles.bigStartBtn} onPress={onStart} activeOpacity={0.85}>
          <Text style={styles.bigStartBtnText}>START DRILL</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function TimerView({
  drillName,
  touchesTarget,
  elapsedSeconds,
  isStarted,
  isRunning,
  onStart,
  onToggle,
  onDone,
  onClose,
}: {
  drillName: string;
  touchesTarget: number;
  elapsedSeconds: number;
  isStarted: boolean;
  isRunning: boolean;
  onStart: () => void;
  onToggle: () => void;
  onDone: () => void;
  onClose: () => void;
}) {
  const mins = Math.floor(elapsedSeconds / 60);
  const secs = elapsedSeconds % 60;
  const display = `${mins.toString().padStart(2, '0')}:${secs.toFixed(1).padStart(4, '0')}`;

  return (
    <View style={styles.timerContainer}>
      <TouchableOpacity style={styles.timerCloseBtn} onPress={onClose} hitSlop={12}>
        <Text style={styles.timerCloseBtnText}>✕</Text>
      </TouchableOpacity>
      <Text style={styles.timerDrillName}>{drillName}</Text>
      <Text style={styles.timerTarget}>Complete {touchesTarget} touches</Text>
      <Text style={[styles.timerDisplay, (!isStarted || !isRunning) && styles.timerDisplayPaused]}>
        {display}
      </Text>
      {!isStarted ? (
        <TouchableOpacity style={styles.startBtn} onPress={onStart} activeOpacity={0.85}>
          <Text style={styles.startBtnText}>START</Text>
        </TouchableOpacity>
      ) : (
        <>
          <TouchableOpacity
            style={[styles.toggleBtn, isRunning ? styles.toggleBtnPause : styles.toggleBtnResume]}
            onPress={onToggle}
            activeOpacity={0.85}
          >
            <Text style={styles.toggleBtnText}>{isRunning ? 'PAUSE' : 'RESUME'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.doneBtn} onPress={onDone} activeOpacity={0.85}>
            <Text style={styles.doneBtnText}>DONE</Text>
          </TouchableOpacity>
        </>
      )}
      {!isStarted && (
        <Text style={styles.timerReadyHint}>Get in position, then tap START</Text>
      )}
    </View>
  );
}

function ResultsView({
  drillName,
  drillId,
  touchesTarget,
  timeSeconds,
  isPb,
  prevBest,
  teamId,
  userId,
  onClose,
  onTrainAgain,
  onChallenge,
}: {
  drillName: string;
  drillId: string;
  touchesTarget: number;
  timeSeconds: number;
  isPb: boolean;
  prevBest: number | null;
  teamId: string | undefined;
  userId: string;
  onClose: () => void;
  onTrainAgain: () => void;
  onChallenge: () => void;
}) {
  const diff = prevBest != null && !isPb ? timeSeconds - prevBest : null;

  return (
    <View style={styles.resultsContainer}>
      <Text style={styles.resultsTime}>{formatTime(timeSeconds)}</Text>

      {isPb ? (
        <View style={styles.pbBanner}>
          <Text style={styles.pbBannerText}>NEW PERSONAL BEST</Text>
        </View>
      ) : diff != null ? (
        <Text style={styles.resultsSlower}>{formatTime(diff)} slower than your best</Text>
      ) : null}

      {teamId && (
        <View style={styles.resultsLeaderboard}>
          <LeaderboardSnippet drillId={drillId} target={touchesTarget} teamId={teamId} userId={userId} />
        </View>
      )}

      <Text style={styles.resultsShared}>Your result was shared with your team.</Text>

      <View style={styles.resultsActions}>
        <TouchableOpacity style={styles.resultsActionPrimary} onPress={onTrainAgain}>
          <Text style={styles.resultsActionPrimaryText}>Train Again</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.resultsActionSecondary} onPress={onChallenge}>
          <Text style={styles.resultsActionSecondaryText}>Challenge Teammate</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.resultsActionSecondary} onPress={onClose}>
          <Text style={styles.resultsActionSecondaryText}>Done</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function ChallengePickerView({
  drillId,
  drillName,
  touchesTarget,
  timeSeconds,
  teamId,
  currentUserId,
  onBack,
  onDone,
}: {
  drillId: string;
  drillName: string;
  touchesTarget: number;
  timeSeconds: number;
  teamId: string;
  currentUserId: string;
  onBack: () => void;
  onDone: () => void;
}) {
  const { data: players = [] } = useTeamPlayers(teamId);
  const { mutateAsync: sendChallenge } = useSendChallenge();
  const [sentIds, setSentIds] = useState<string[]>([]);
  const [sendingId, setSendingId] = useState<string | null>(null);

  const teammates = players.filter((p) => p.id !== currentUserId);

  const handleChallenge = async (player: (typeof players)[number]) => {
    if (sendingId || sentIds.includes(player.id)) return;
    setSendingId(player.id);
    try {
      await sendChallenge({
        challengerId: currentUserId,
        challengedId: player.id,
        touchesTarget,
        timeLimitHours: 24,
        drillId,
        drillName,
        challengerTimeSeconds: timeSeconds,
        challengedPushToken: player.expo_push_token ?? null,
      });
      setSentIds((prev) => [...prev, player.id]);
    } catch {
      // ignore — show nothing on failure
    } finally {
      setSendingId(null);
    }
  };

  return (
    <View style={styles.pickerContainer}>
      <View style={styles.pickerHeader}>
        <TouchableOpacity onPress={onBack} style={styles.pickerBack}>
          <Text style={styles.pickerBackText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.pickerTitle}>Challenge a Teammate</Text>
      </View>
      <View style={styles.pickerContext}>
        <Text style={styles.pickerContextText}>
          {drillName} · {touchesTarget} touches
        </Text>
        <Text style={styles.pickerContextTime}>{formatTime(timeSeconds)}</Text>
      </View>
      <ScrollView style={styles.pickerList} contentContainerStyle={{ paddingBottom: 32 }}>
        {teammates.length === 0 && (
          <Text style={styles.pickerEmpty}>No teammates to challenge yet.</Text>
        )}
        {teammates.map((player) => {
          const isSent = sentIds.includes(player.id);
          const isSending = sendingId === player.id;
          const name = player.display_name || player.name || 'Teammate';
          return (
            <View key={player.id} style={styles.pickerRow}>
              <Image
                source={{ uri: player.avatar_url || 'https://cdn-icons-png.flaticon.com/512/4140/4140037.png' }}
                style={styles.pickerAvatar}
              />
              <Text style={styles.pickerName} numberOfLines={1}>{name}</Text>
              <TouchableOpacity
                style={[styles.pickerBtn, isSent && styles.pickerBtnSent]}
                onPress={() => handleChallenge(player)}
                disabled={isSent || !!sendingId}
                activeOpacity={0.8}
              >
                <Text style={[styles.pickerBtnText, isSent && styles.pickerBtnTextSent]}>
                  {isSending ? '...' : isSent ? 'Sent ✓' : 'Challenge'}
                </Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </ScrollView>
      {sentIds.length > 0 && (
        <TouchableOpacity style={styles.pickerDoneBtn} onPress={onDone}>
          <Text style={styles.pickerDoneBtnText}>Done</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export default TrainPage;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 20,
  },

  // CATEGORY
  categorySection: {
    gap: 10,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#1a1a2e',
  },

  // DRILL CARD
  drillCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  drillThumb: {
    width: 52,
    height: 52,
    borderRadius: 12,
  },
  drillThumbPlaceholder: {
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playTriangle: {
    width: 0,
    height: 0,
    borderTopWidth: 9,
    borderBottomWidth: 9,
    borderLeftWidth: 16,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: '#1f89ee',
    marginLeft: 3,
  },
  playTriangleLg: {
    width: 0,
    height: 0,
    borderTopWidth: 20,
    borderBottomWidth: 20,
    borderLeftWidth: 36,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: '#1f89ee',
    marginLeft: 6,
    opacity: 0.7,
  },
  drillInfo: {
    flex: 1,
    gap: 4,
  },
  drillName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1a1a2e',
  },
  drillMeta: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  drillPb: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1f89ee',
  },
  drillNoPb: {
    fontSize: 12,
    fontWeight: '600',
    color: '#B0BEC5',
  },
  drillRank: {
    fontSize: 12,
    fontWeight: '700',
    color: '#78909C',
  },
  startBtn: {
    backgroundColor: '#1f89ee',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  startBtnText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },

  // LOG BUTTON
  gameSpeedCard: {
    backgroundColor: '#1a1a2e',
    borderRadius: 20,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  gameSpeedInfo: {
    flex: 1,
    gap: 4,
  },
  gameSpeedTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  gameSpeedSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.5)',
    lineHeight: 17,
  },
  gameSpeedBtn: {
    backgroundColor: '#ffb724',
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  gameSpeedBtnText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#1a1a2e',
    letterSpacing: 0.5,
  },
  logButton: {
    alignSelf: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  logButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#78909C',
    textDecorationLine: 'underline',
  },

  // MODAL
  modalContainer: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },

  // DETAIL VIEW
  detailContainer: {
    flex: 1,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: '#FFFFFF',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F5F7FA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtnText: {
    fontSize: 16,
    color: '#78909C',
    fontWeight: '700',
  },
  detailTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1a1a2e',
  },
  detailScroll: {
    padding: 16,
    gap: 16,
    paddingBottom: 100,
  },
  detailImage: {
    width: '100%',
    height: 200,
    borderRadius: 16,
  },
  detailImagePlaceholder: {
    width: '100%',
    height: 180,
    borderRadius: 16,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailDescription: {
    fontSize: 14,
    fontWeight: '600',
    color: '#78909C',
    lineHeight: 20,
  },
  targetLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1a1a2e',
  },
  targetRow: {
    flexDirection: 'row',
    gap: 10,
  },
  targetBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  targetBtnSelected: {
    borderColor: '#1f89ee',
    backgroundColor: '#EFF6FF',
  },
  targetBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#78909C',
  },
  targetBtnTextSelected: {
    color: '#1f89ee',
  },
  pbRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
  },
  pbLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#78909C',
  },
  pbValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1f89ee',
  },
  detailFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: '#F5F7FA',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  bigStartBtn: {
    backgroundColor: '#31af4d',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  bigStartBtnText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1,
  },

  // LEADERBOARD SNIPPET
  miniBoard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  miniBoardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  miniBoardRowMe: {
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    paddingHorizontal: 6,
    marginHorizontal: -6,
  },
  miniBoardRank: {
    fontSize: 13,
    fontWeight: '700',
    color: '#78909C',
    width: 28,
  },
  miniBoardName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: '#1a1a2e',
  },
  miniBoardTime: {
    fontSize: 14,
    fontWeight: '900',
    color: '#1f89ee',
  },

  // TIMER VIEW
  timerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    padding: 24,
    gap: 16,
  },
  timerDrillName: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  timerTarget: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.5)',
  },
  timerDisplay: {
    fontSize: 72,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -2,
    fontVariant: ['tabular-nums'],
  },
  timerDisplayPaused: {
    color: 'rgba(255,255,255,0.4)',
  },
  toggleBtn: {
    borderRadius: 20,
    paddingHorizontal: 48,
    paddingVertical: 18,
    marginTop: 16,
    minWidth: 200,
    alignItems: 'center',
  },
  toggleBtnPause: {
    backgroundColor: '#ffb724',
  },
  toggleBtnResume: {
    backgroundColor: '#1f89ee',
  },
  toggleBtnText: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  doneBtn: {
    backgroundColor: '#31af4d',
    borderRadius: 16,
    paddingHorizontal: 36,
    paddingVertical: 14,
    minWidth: 200,
    alignItems: 'center',
  },
  doneBtnText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1,
  },

  // RESULTS VIEW
  resultsContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 16,
    backgroundColor: '#F5F7FA',
  },
  resultsTime: {
    fontSize: 64,
    fontWeight: '900',
    color: '#1a1a2e',
    letterSpacing: -2,
  },
  pbBanner: {
    backgroundColor: '#31af4d',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  pbBannerText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  resultsSlower: {
    fontSize: 14,
    fontWeight: '600',
    color: '#78909C',
  },
  resultsLeaderboard: {
    width: '100%',
  },
  resultsShared: {
    fontSize: 13,
    fontWeight: '600',
    color: '#B0BEC5',
  },
  resultsActions: {
    width: '100%',
    gap: 10,
    marginTop: 8,
  },
  resultsActionPrimary: {
    backgroundColor: '#1f89ee',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  resultsActionPrimaryText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  resultsActionSecondary: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  resultsActionSecondaryText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1a1a2e',
  },

  // TIMER — close button
  timerCloseBtn: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timerCloseBtnText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 16,
    fontWeight: '700',
  },

  // TIMER — ready hint
  timerReadyHint: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.35)',
    textAlign: 'center',
    marginTop: 8,
  },

  // CHALLENGE PICKER
  pickerContainer: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    gap: 12,
  },
  pickerBack: {
    paddingVertical: 4,
    paddingRight: 8,
  },
  pickerBackText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1f89ee',
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1a1a2e',
  },
  pickerContext: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  pickerContextText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#78909C',
  },
  pickerContextTime: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1f89ee',
  },
  pickerList: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  pickerEmpty: {
    textAlign: 'center',
    color: '#78909C',
    fontWeight: '600',
    fontSize: 14,
    paddingTop: 32,
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  pickerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E5E7EB',
  },
  pickerName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: '#1a1a2e',
  },
  pickerBtn: {
    backgroundColor: '#1f89ee',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  pickerBtnSent: {
    backgroundColor: '#31af4d',
  },
  pickerBtnText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  pickerBtnTextSent: {
    color: '#FFFFFF',
  },
  pickerDoneBtn: {
    margin: 16,
    backgroundColor: '#1a1a2e',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  pickerDoneBtnText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#FFFFFF',
  },
});
