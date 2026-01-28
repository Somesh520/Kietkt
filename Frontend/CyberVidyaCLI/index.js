/**
 * @format
 */
import 'react-native-gesture-handler';
// ⏱️ Capture App Start Time immediately
global.appStartTime = Date.now();

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

AppRegistry.registerComponent(appName, () => App);