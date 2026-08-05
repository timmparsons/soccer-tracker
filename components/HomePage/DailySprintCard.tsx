import DurationChallengeModal from '@/components/HomePage/ChallengeTimer/DurationChallengeModal';
import SprintTimerModal from '@/components/HomePage/ChallengeTimer/SprintTimerModal';
import DrillVideoModal from '@/components/modals/DrillVideoModal';
import { ChallengeResult } from '@/hooks/useChallengeTimer';
import { useDailySprint } from '@/hooks/useDailySprint';
import { maybePromptForReviewAfterPR } from '@/lib/rateApp';
import { VinnieSprintResult } from '@/lib/vinnie';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface DailySprintCardProps {
  userId: string;
  teamId: string | null | undefined;
  onAttemptSubmitted?: (result: VinnieSprintResult) => void;
}

function formatDuration(ms: number): string {
  return `${(ms / 1000).toFixed(2)}s`;
}

function formatChallengeDuration(seconds: number): string {
  const minutes = Math.round(seconds / 60);
  return `${minutes} min`;
}

const DailySprintCard = ({ userId, teamId, onAttemptSubmitted }: DailySprintCardProps) => {
  const { sprint, isLoading, submitAttempt, submitReps } = useDailySprint(userId, teamId);
  const [modalVisible, setModalVisible] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [videoStep, setVideoStep] = useState<{ name: string; videoUrl: string } | null>(null);

  if (isLoading) {
    return (
      <View style={styles.card}>
        <ActivityIndicator size='small' color='#1f89ee' />
      </View>
    );
  }

  if (!sprint) return null;

  const handleSubmit = (result: ChallengeResult) => {
    // sprint.personalBestMs is the *prior* best — a null value means this was their
    // first-ever attempt, which always counts as a PR but isn't a real "win" moment.
    if (result.isPR && sprint.personalBestMs != null) {
      maybePromptForReviewAfterPR();
    }
    submitAttempt(result.durationMs, result.isPR, result.isCrown);
    onAttemptSubmitted?.({ ...result, comboName: sprint.comboName });
  };

  const handleSubmitReps = (repsCompleted: number, isPR: boolean) => {
    if (isPR && sprint.personalBestReps != null) {
      maybePromptForReviewAfterPR();
    }
    submitReps(repsCompleted, isPR);
    onAttemptSubmitted?.({ comboName: sprint.comboName, isPR, isCrown: false, repsCompleted });
  };

  return (
    <>
      <View style={styles.card}>
        <TouchableOpacity activeOpacity={0.7} onPress={() => setExpanded((e) => !e)}>
          <View style={styles.headerRow}>
            <Ionicons name='flash' size={14} color='#1f89ee' />
            <Text style={styles.headerLabel}>TODAY&apos;S CHALLENGE</Text>
            <View style={styles.headerSpacer} />
            <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color='#78909C' />
          </View>
          <Text style={styles.title}>{sprint.comboName}</Text>
          <Text style={styles.stepSummary} numberOfLines={2}>
            {sprint.isDurationMode
              ? `${formatChallengeDuration(sprint.durationSeconds!)} · ${sprint.comboSteps.join(' → ')}`
              : `5x ${sprint.comboSteps.join(' → ')}`}
          </Text>
        </TouchableOpacity>

        {expanded && (
          <View style={styles.drillList}>
            {(sprint.comboDrills ?? []).map((drill, i) => (
              <View key={i} style={styles.drillRow}>
                <Text style={styles.drillRowText}>
                  {i + 1}. {drill.name}
                </Text>
                {drill.videoUrl ? (
                  <TouchableOpacity
                    style={styles.watchButton}
                    onPress={() => setVideoStep({ name: drill.name, videoUrl: drill.videoUrl! })}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name='play-circle-outline' size={18} color='#1f89ee' />
                    <Text style={styles.watchButtonText}>Watch</Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={styles.noVideoText}>Video coming soon</Text>
                )}
              </View>
            ))}
          </View>
        )}

        {sprint.isDurationMode ? (
          sprint.todayBestReps != null ? (
            <View style={styles.completedRow}>
              <View style={styles.completedPill}>
                <Text style={styles.completedPillText}>Done: {sprint.todayBestReps} reps</Text>
              </View>
              <TouchableOpacity style={styles.retryChip} onPress={() => setModalVisible(true)} activeOpacity={0.8}>
                <Text style={styles.retryChipText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.startButton} onPress={() => setModalVisible(true)} activeOpacity={0.8}>
              <Text style={styles.startButtonText}>Start Challenge</Text>
            </TouchableOpacity>
          )
        ) : sprint.todayBestMs != null ? (
          <View style={styles.completedRow}>
            <View style={styles.completedPill}>
              <Text style={styles.completedPillText}>Done in {formatDuration(sprint.todayBestMs)}</Text>
            </View>
            <TouchableOpacity style={styles.retryChip} onPress={() => setModalVisible(true)} activeOpacity={0.8}>
              <Text style={styles.retryChipText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.startButton} onPress={() => setModalVisible(true)} activeOpacity={0.8}>
            <Text style={styles.startButtonText}>Start Challenge</Text>
          </TouchableOpacity>
        )}

        {sprint.isDurationMode ? (
          (sprint.personalBestReps != null || sprint.teamLeaderName) && (
            <View style={styles.footerRow}>
              {sprint.personalBestReps != null && (
                <Text style={styles.footerText}>Personal Best: {sprint.personalBestReps} reps</Text>
              )}
              {sprint.teamLeaderName && sprint.teamLeaderReps != null && (
                <Text style={styles.footerText}>
                  Team Leader: {sprint.teamLeaderName} ({sprint.teamLeaderReps} reps)
                </Text>
              )}
            </View>
          )
        ) : (
          (sprint.personalBestMs != null || sprint.teamLeaderName || sprint.rank != null) && (
            <View style={styles.footerRow}>
              {sprint.personalBestMs != null && (
                <Text style={styles.footerText}>Personal Best: {formatDuration(sprint.personalBestMs)}</Text>
              )}
              {sprint.teamLeaderName && sprint.teamLeaderMs != null && (
                <Text style={styles.footerText}>
                  Team Leader: {sprint.teamLeaderName} ({formatDuration(sprint.teamLeaderMs)})
                </Text>
              )}
              {sprint.rank != null && (
                <Text style={styles.footerText}>Rank: #{sprint.rank}</Text>
              )}
            </View>
          )
        )}
      </View>

      {sprint.isDurationMode ? (
        <DurationChallengeModal
          visible={modalVisible}
          drillName={sprint.comboSteps[0]}
          durationSeconds={sprint.durationSeconds!}
          personalBestReps={sprint.personalBestReps}
          teamAvgReps={sprint.teamAvgReps}
          onClose={() => setModalVisible(false)}
          onSubmit={handleSubmitReps}
        />
      ) : (
        <SprintTimerModal
          visible={modalVisible}
          comboName={sprint.comboName}
          comboSteps={sprint.comboSteps}
          comboTouches={sprint.comboTouches}
          personalBestMs={sprint.personalBestMs}
          teamPaceMs={sprint.teamPaceMs}
          crownThresholdMs={sprint.crownThresholdMs}
          onClose={() => setModalVisible(false)}
          onSubmit={handleSubmit}
        />
      )}

      {videoStep && (
        <DrillVideoModal
          visible={!!videoStep}
          onClose={() => setVideoStep(null)}
          videoUrl={videoStep.videoUrl}
          drillName={videoStep.name}
        />
      )}
    </>
  );
};

export default DailySprintCard;

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#1f89ee',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  headerLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1f89ee',
    letterSpacing: 1.2,
  },
  headerSpacer: {
    flex: 1,
  },
  drillList: {
    gap: 2,
    marginBottom: 14,
    paddingTop: 2,
    borderTopWidth: 1,
    borderTopColor: '#F0F4F8',
  },
  drillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  drillRowText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a2e',
    flex: 1,
  },
  watchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  watchButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1f89ee',
  },
  noVideoText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#B0BEC5',
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1a1a2e',
    marginBottom: 8,
  },
  stepSummary: {
    fontSize: 14,
    fontWeight: '600',
    color: '#78909C',
    marginBottom: 14,
    lineHeight: 20,
  },
  completedRow: {
    flexDirection: 'row',
    gap: 8,
  },
  completedPill: {
    backgroundColor: '#F0FDF4',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#D1FAE5',
  },
  completedPillText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#31af4d',
  },
  retryChip: {
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#1f89ee',
  },
  retryChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1f89ee',
  },
  startButton: {
    backgroundColor: '#1f89ee',
    borderRadius: 14,
    paddingVertical: 11,
    alignItems: 'center',
    shadowColor: '#1f89ee',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  startButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  footerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F0F4F8',
  },
  footerText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#78909C',
  },
});
