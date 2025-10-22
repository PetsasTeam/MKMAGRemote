/**
 * IPTV MK Remote App
 * Modern remote control for Infomir MAG devices
 */

import React from 'react';
import { StatusBar, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { Provider as PaperProvider, MD3DarkTheme } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Screens
import HomeScreen from './src/screens/HomeScreen';
import RemoteScreen from './src/screens/RemoteScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import DeviceDiscoveryScreen from './src/screens/DeviceDiscoveryScreen';

// Context
import { DeviceProvider } from './src/context/DeviceContext';

// Types
export type RootStackParamList = {
  Home: undefined;
  Remote: { deviceId: string; deviceName: string; deviceIp: string };
  Settings: undefined;
  DeviceDiscovery: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

// Custom theme with modern colors
const theme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#00A8E8',
    secondary: '#007EA7',
    tertiary: '#003459',
    background: '#000814',
    surface: '#001D3D',
    error: '#FF6B6B',
    onBackground: '#FFFFFF',
    onSurface: '#FFFFFF',
  },
};

function App(): React.JSX.Element {
  return (
    <SafeAreaProvider>
      <PaperProvider theme={theme}>
        <DeviceProvider>
          <NavigationContainer>
            <StatusBar barStyle="light-content" backgroundColor="#000814" />
            <Stack.Navigator
              initialRouteName="Home"
              screenOptions={{
                headerStyle: {
                  backgroundColor: '#001D3D',
                },
                headerTintColor: '#FFFFFF',
                headerTitleStyle: {
                  fontWeight: 'bold',
                },
              }}>
              <Stack.Screen
                name="Home"
                component={HomeScreen}
                options={{ title: 'IPTV MK Remote' }}
              />
              <Stack.Screen
                name="Remote"
                component={RemoteScreen}
                options={({ route }) => ({
                  title: route.params.deviceName,
                })}
              />
              <Stack.Screen
                name="Settings"
                component={SettingsScreen}
                options={{ title: 'Settings' }}
              />
              <Stack.Screen
                name="DeviceDiscovery"
                component={DeviceDiscoveryScreen}
                options={{ title: 'Find MAG Devices' }}
              />
            </Stack.Navigator>
          </NavigationContainer>
        </DeviceProvider>
      </PaperProvider>
    </SafeAreaProvider>
  );
}

export default App;
