import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

export default function SplashScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.appName}>MasterTouch</Text>
      <Text style={styles.ball}>⚽</Text>
      {/* TODO: replace ActivityIndicator with animated soccer ball */}
      <ActivityIndicator size='large' color='#FFF' style={styles.indicator} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
  },
  appName: {
    fontSize: 36,
    fontWeight: '900',
    color: '#FFF',
    marginBottom: 16,
    letterSpacing: -1,
  },
  ball: {
    fontSize: 48,
    marginBottom: 32,
  },
  indicator: {
    marginTop: 8,
  },
});
