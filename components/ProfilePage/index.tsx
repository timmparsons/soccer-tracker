import React from 'react';
import { StyleSheet, View } from 'react-native';
import ProfilePage from './ProfileSection';

const index = () => {
  return (
    <View style={styles.container}>
      <ProfilePage />
    </View>
  );
};

export default index;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
