import React from 'react';
import { Button, StyleSheet, Text, View } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { decrement, increment } from '../redux/counterSlice';

export function Counter() {
  const count = useSelector((state: any) => {
    console.log('State', state);
    return state.counter.value;
  });
  const dispatch = useDispatch();

  return (
    <View style={styles.container}>
      <Button title='Increment' onPress={() => dispatch(increment())} />
      <Text style={styles.countText}>{count}</Text>
      <Button title='Decrement' onPress={() => dispatch(decrement())} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  countText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
});
