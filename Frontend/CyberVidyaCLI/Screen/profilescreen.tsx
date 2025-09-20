// Screen/ProfileScreen.tsx

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

function ProfileScreen(): React.JSX.Element {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Profile Screen</Text>
      <Text>Yahan user ki profile details aayengi.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
});

export default ProfileScreen;