import { StyleSheet, Text, View } from 'react-native';

const Progress = () => {
  return (
    <View>
      <Text>Log</Text>
    </View>
  );
};

export default Progress;

const styles = StyleSheet.create({
  headerImage: {
    color: '#808080',
    bottom: -90,
    left: -35,
    position: 'absolute',
  },
  titleContainer: {
    flexDirection: 'row',
    gap: 8,
  },
});
