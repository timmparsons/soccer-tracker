import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import TimerPage from './TimerPage';

const index = () => {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.logoutSection}>
        <TouchableOpacity style={styles.logoutButton} onPress={handleSignOut}>
          <Ionicons name='log-out-outline' size={22} color='#EF4444' />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </View>
      <TimerPage />
    </ScrollView>
  );
};

export default index;

const styles = StyleSheet.create({
  container: {
    // flex: 1,
    backgroundColor: '#f9fafb',
  },
});
