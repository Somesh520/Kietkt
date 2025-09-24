module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    // ... other plugins
    'react-native-worklets/plugin', // <-- Add this line
  ],
};
