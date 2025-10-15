import TrainPage from '@/components/TrainPage';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const Train = () => {
  return (
    <SafeAreaView>
      <TrainPage />
    </SafeAreaView>
  );
};

export default Train;

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
