/**
 * MAG Remote App
 * Modern remote control for Infomir MAG devices
 */

import React from 'react';
import { StatusBar, StyleSheet } from 'react-native';
import { DarkTheme as NavigationDarkTheme, NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { Provider as PaperProvider, MD3DarkTheme } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Screens
import HomeScreen from './src/screens/HomeScreen';
import RemoteScreen from './src/screens/RemoteScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import DeviceDiscoveryScreen from './src/screens/DeviceDiscoveryScreen';
import MacrosScreen from './src/screens/MacrosScreen';
import QuickActionsScreen from './src/screens/QuickActionsScreen';

// Context
import { DeviceProvider } from './src/context/DeviceContext';
import { colors } from './src/theme/tokens';

// Types
export type RootStackParamList = {
  Home: undefined;
  Remote: { deviceId: string; deviceName: string; deviceIp: string };
  Settings: undefined;
  DeviceDiscovery: undefined;
  Macros: undefined;
  QuickActions: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

// Dark theme built from the app's design tokens (src/theme/tokens.ts).
const theme = {
  ...MD3DarkTheme,
  roundness: 4,
  colors: {
    ...MD3DarkTheme.colors,
    primary: colors.accent,
    onPrimary: '#FFFFFF',
    primaryContainer: colors.accentSoft,
    secondary: colors.accentText,
    background: colors.background,
    surface: colors.surface,
    surfaceVariant: colors.control,
    elevation: {
      ...MD3DarkTheme.colors.elevation,
      level1: colors.surface,
      level2: colors.surface,
      level3: colors.surface,
    },
    outline: colors.border,
    error: colors.danger,
    onBackground: colors.text,
    onSurface: colors.text,
    onSurfaceVariant: colors.textSecondary,
  },
};

const navigationTheme = {
  ...NavigationDarkTheme,
  colors: {
    ...NavigationDarkTheme.colors,
    primary: colors.accent,
    background: colors.background,
    card: colors.background,
    text: colors.text,
    border: colors.background,
  },
};

function App(): React.JSX.Element {
  return (
    <SafeAreaProvider>
      <PaperProvider theme={theme}>
        <DeviceProvider>
          <NavigationContainer theme={navigationTheme}>
            <StatusBar barStyle="light-content" backgroundColor={colors.background} />
            <Stack.Navigator
              initialRouteName="Home"
              screenOptions={{
                headerStyle: { backgroundColor: colors.background },
                headerShadowVisible: false,
                headerTintColor: colors.text,
                headerTitleStyle: { fontWeight: '600', fontSize: 16 },
                headerBackTitleVisible: false,
                cardStyle: { backgroundColor: colors.background },
              }}>
              <Stack.Screen
                name="Home"
                component={HomeScreen}
                options={{ title: 'Devices', headerShown: false }}
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
                options={{ title: 'Add a box' }}
              />
              <Stack.Screen name="Macros" component={MacrosScreen} options={{ title: 'Macros' }} />
              <Stack.Screen
                name="QuickActions"
                component={QuickActionsScreen}
                options={{ title: 'Quick Actions' }}
              />
            </Stack.Navigator>
          </NavigationContainer>
        </DeviceProvider>
      </PaperProvider>
    </SafeAreaProvider>
  );
}

export default App;
