import { SessionLog } from '@/hooks/useTouchTracking';
import { formatTimeAgo } from '@/utils/formatTimeAgo';
import { sessionTimestamp } from '@/utils/sessionTimestamp';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface SessionRowProps {
  session: SessionLog;
  onEdit?: () => void;
}

export default function SessionRow({ session, onEdit }: SessionRowProps) {
  return (
    <View style={styles.sessionItem}>
      <View style={styles.sessionLeft}>
        <View style={styles.sessionIconBg}>
          <Text style={styles.sessionEmoji}>⚽</Text>
        </View>
        <View style={styles.sessionInfo}>
          <Text style={styles.sessionName}>
            {session.drill_name || 'Free Practice'}
          </Text>
          <View style={styles.sessionMeta}>
            <Text style={styles.sessionTime}>
              {formatTimeAgo(sessionTimestamp(session.date, session.created_at))}
            </Text>
            {session.duration_minutes && (
              <>
                <Text style={styles.sessionDot}>•</Text>
                <Text style={styles.sessionDuration}>
                  {session.duration_minutes} min
                </Text>
              </>
            )}
          </View>
          {session.focus_areas && session.focus_areas.length > 0 && (
            <View style={styles.focusTags}>
              {session.focus_areas.map((area) => (
                <View key={area} style={styles.focusTag}>
                  <Text style={styles.focusTagText}>
                    {area.replace('_', ' ')}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </View>
      <View style={styles.sessionRight}>
        <Text style={styles.sessionTouches}>
          {session.touches_logged.toLocaleString()}
        </Text>
        <Text style={styles.sessionTouchesLabel}>touches</Text>
        {session.duration_minutes && session.duration_minutes > 0 && (
          <Text style={styles.sessionTpm}>
            ⚡ {Math.round(session.touches_logged / session.duration_minutes)}/min
          </Text>
        )}
      </View>
      {onEdit && (
        <TouchableOpacity
          style={styles.sessionEditButton}
          onPress={onEdit}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name='pencil' size={16} color='#78909C' />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  sessionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F7FA',
  },
  sessionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  sessionIconBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sessionEmoji: {
    fontSize: 20,
  },
  sessionInfo: {
    flex: 1,
  },
  sessionName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1a1a2e',
    marginBottom: 4,
  },
  sessionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sessionTime: {
    fontSize: 12,
    color: '#78909C',
    fontWeight: '600',
  },
  sessionDot: {
    fontSize: 12,
    color: '#B0BEC5',
  },
  sessionDuration: {
    fontSize: 12,
    color: '#78909C',
    fontWeight: '600',
  },
  sessionRight: {
    alignItems: 'flex-end',
  },
  sessionTouches: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1f89ee',
    marginBottom: 2,
  },
  sessionTouchesLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#78909C',
    textTransform: 'uppercase',
  },
  sessionTpm: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FF9800',
    marginTop: 4,
  },
  sessionEditButton: {
    padding: 6,
    marginLeft: 8,
  },
  focusTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 6,
  },
  focusTag: {
    backgroundColor: '#EFF6FF',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  focusTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1f89ee',
    textTransform: 'capitalize',
  },
});
