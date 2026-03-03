import { ActivityIndicator, Image, StyleSheet, View } from 'react-native';

export default function SplashScreen() {
  return (
    <View style={styles.container}>
      <Image
        source={require('../assets/images/app-logo-transparent.png')}
        style={styles.logo}
      />
      <ActivityIndicator size='large' color='#1a1a2e' style={styles.indicator} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF',
  },
  logo: {
    width: 120,
    height: 120,
  },
  indicator: {
    marginTop: 32,
  },
});
