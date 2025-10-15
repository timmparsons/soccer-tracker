import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface DailyChallengeCardProps {
  title: string;
  challengeName: string;
  description: string;
  duration: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  reward: number;
  onPress: () => void;
  icon?: any; // optional local image
}

const DailyChallengeCard: React.FC<DailyChallengeCardProps> = ({
  title,
  challengeName,
  description,
  duration,
  difficulty,
  reward,
  onPress,
  icon,
}) => {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>{title} ⚽</Text>
        <View style={styles.rewardBadge}>
          <Text style={styles.rewardText}>+{reward} ⭐</Text>
        </View>
      </View>

      <Text style={styles.challengeName}>{challengeName}</Text>
      <Text style={styles.description}>{description}</Text>

      <View style={styles.infoRow}>
        <Text style={styles.infoText}>⏱ {duration}</Text>
        <Text style={styles.infoText}>🏆 {difficulty}</Text>
      </View>

      <View style={styles.bottomRow}>
        {/* {icon && <Image source={icon} style={styles.icon} />} */}
        <TouchableOpacity style={styles.button} onPress={onPress}>
          <Text style={styles.buttonText}>Start Challenge 🚀</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default DailyChallengeCard;

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1E73FF',
    borderRadius: 16,
    padding: 16,
    margin: 12,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
  },
  rewardBadge: {
    backgroundColor: '#FFD84D',
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  rewardText: {
    fontWeight: '600',
    color: '#333',
  },
  challengeName: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 10,
  },
  description: {
    color: 'white',
    fontSize: 14,
    marginTop: 4,
    marginBottom: 10,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  infoText: {
    color: 'white',
    fontSize: 14,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    // justifyContent: 'space-between',
  },
  icon: {
    width: 50,
    height: 50,
    borderRadius: 10,
  },
  button: {
    backgroundColor: '#FFD84D',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 18,
    alignSelf: 'flex-end',
  },
  buttonText: {
    color: '#333',
    fontWeight: '700',
    fontSize: 15,
  },
});
