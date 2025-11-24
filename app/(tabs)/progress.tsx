import TrainPage from '@/components/ProgressPage';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const Train = () => {
  return (
    <SafeAreaView style={styles.container}>
      <TrainPage />
    </SafeAreaView>
  );
};

export default Train;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
});
