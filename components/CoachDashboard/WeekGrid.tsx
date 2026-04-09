import { getLocalDate } from '@/utils/getLocalDate';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface PlayerStats {
  id: string;
  name: string;
  display_name: string;
  avatar_url: string | null;
  daily_target: number;
}

interface WeekGridProps {
  players: PlayerStats[];
  sessionMap: Record<string, Record<string, { touches: number }>>;
  weekDates: string[];
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
  onPlayerPress: (playerId: string) => void;
}

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export default function WeekGrid({
  players,
  sessionMap,
  weekDates,
  selectedDate,
  onSelectDate,
  onPlayerPress,
}: WeekGridProps) {
  const today = getLocalDate();

  return (
    <View style={styles.container}>
      {/* Column headers */}
      <View style={styles.headerRow}>
        <View style={styles.nameCol} />
        {weekDates.map((date, i) => {
          const isToday = date === today;
          const isSelected = date === selectedDate;
          return (
            <TouchableOpacity
              key={date}
              style={styles.headerCell}
              onPress={() => onSelectDate(isSelected ? '' : date)}
              hitSlop={{ top: 4, bottom: 4, left: 2, right: 2 }}
            >
              <Text
                style={[
                  styles.headerText,
                  isToday && styles.headerTextToday,
                  isSelected && styles.headerTextSelected,
                ]}
              >
                {DAY_LABELS[i]}
              </Text>
              {isToday && <View style={[styles.todayDot, isSelected && styles.todayDotSelected]} />}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Player rows */}
      {players.map((player) => {
        const firstName = (player.display_name || player.name || 'Player').split(' ')[0];
        return (
          <TouchableOpacity
            key={player.id}
            style={styles.playerRow}
            onPress={() => onPlayerPress(player.id)}
            activeOpacity={0.7}
          >
            <View style={styles.nameCol}>
              <Image
                source={{
                  uri:
                    player.avatar_url ||
                    'https://cdn-icons-png.flaticon.com/512/4140/4140037.png',
                }}
                style={styles.avatar}
              />
              <Text style={styles.firstName} numberOfLines={1}>
                {firstName}
              </Text>
            </View>

            {weekDates.map((date) => {
              const touches = sessionMap[player.id]?.[date]?.touches ?? 0;
              const hitTarget = touches >= player.daily_target;
              const trained = touches > 0;
              const isSelected = date === selectedDate;

              return (
                <View
                  key={date}
                  style={[
                    styles.cell,
                    trained
                      ? hitTarget
                        ? styles.cellHit
                        : styles.cellTrained
                      : styles.cellEmpty,
                    isSelected && styles.cellSelected,
                  ]}
                />
              );
            })}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  nameCol: {
    width: 84,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  avatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#F3F4F6',
  },
  firstName: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1a1a2e',
    flexShrink: 1,
  },
  headerCell: {
    flex: 1,
    alignItems: 'center',
    paddingBottom: 2,
  },
  headerText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#9CA3AF',
  },
  headerTextToday: {
    color: '#1f89ee',
  },
  headerTextSelected: {
    color: '#1f89ee',
  },
  todayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#1f89ee',
    marginTop: 2,
  },
  todayDotSelected: {
    backgroundColor: '#1f89ee',
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  cell: {
    flex: 1,
    height: 26,
    borderRadius: 5,
    marginHorizontal: 2,
  },
  cellEmpty: {
    backgroundColor: '#EEF2F7',
  },
  cellTrained: {
    backgroundColor: '#A7DEB5',
  },
  cellHit: {
    backgroundColor: '#31af4d',
  },
  cellSelected: {
    borderWidth: 1.5,
    borderColor: '#1f89ee',
  },
});
