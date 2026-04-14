import { Image, StyleSheet, View } from 'react-native';

export default function SplashScreen({ fullScreen = false }: { fullScreen?: boolean }) {
  return (
    <View style={[styles.container, fullScreen && styles.fullScreenOffset]}>
      <Image
        source={require('../assets/images/app-logo.png')}
        style={styles.logo}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
  },
  // Shifts the logo up so it lands in the same spot once the tab bar
  // and status bar area appear. Values: top ~44 (notch) + bottom ~83 (tab bar + home indicator).
  fullScreenOffset: {
    paddingTop: 44,
    paddingBottom: 83,
  },
  logo: {
    width: 150,
    height: 150,
    borderRadius: 30,
  },
});
