/**
 * BoxPilot App
 * Modern remote control for Infomir MAG devices
 */

import React from 'react';
import { StatusBar, StyleSheet, View } from 'react-native';
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
import OnboardingScreen from './src/screens/OnboardingScreen';
import PaywallScreen from './src/screens/PaywallScreen';
import PrivacyScreen from './src/screens/PrivacyScreen';

// Context
import { DeviceProvider, useDevice } from './src/context/DeviceContext';
import { EntitlementProvider, useEntitlement } from './src/context/EntitlementContext';
import { colors } from './src/theme/tokens';
import { t } from './src/i18n';

// Types
export type RootStackParamList = {
  Home: undefined;
  Remote: { deviceId: string; deviceName: string; deviceIp: string };
  Settings: undefined;
  DeviceDiscovery: undefined;
  Macros: undefined;
  QuickActions: undefined;
  Guide: undefined;
  Privacy: undefined;
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
    // Snackbars use the inverse pair; keep them light-on-dark like the rest of the app.
    inverseSurface: colors.controlPressed,
    inverseOnSurface: colors.text,
    inversePrimary: colors.accentText,
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

const GuideScreen: React.FC<{ navigation: { goBack: () => void } }> = ({ navigation }) => (
  <OnboardingScreen onDone={() => navigation.goBack()} />
);

/** First-run guide, then the paywall while locked, then the app. */
function Root(): React.JSX.Element {
  const { ready, settings, updateSettings } = useDevice();
  const { entitlement } = useEntitlement();

  if (!ready || entitlement.status === 'loading') {
    return <View style={styles.blank} />;
  }
  if (!settings.onboardingDone) {
    return <OnboardingScreen onDone={() => updateSettings({ onboardingDone: true })} />;
  }
  if (entitlement.status === 'trialAvailable' || entitlement.status === 'expired') {
    return <PaywallScreen />;
  }
  return (
    <NavigationContainer theme={navigationTheme}>
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
          options={{ title: t('nav.devices'), headerShown: false }}
        />
        <Stack.Screen
          name="Remote"
          component={RemoteScreen}
          options={({ route }) => ({ title: route.params.deviceName })}
        />
        <Stack.Screen
          name="Settings"
          component={SettingsScreen}
          options={{ title: t('nav.settings') }}
        />
        <Stack.Screen
          name="DeviceDiscovery"
          component={DeviceDiscoveryScreen}
          options={{ title: t('nav.addBox') }}
        />
        <Stack.Screen name="Macros" component={MacrosScreen} options={{ title: t('nav.macros') }} />
        <Stack.Screen
          name="QuickActions"
          component={QuickActionsScreen}
          options={{ title: t('nav.quickActions') }}
        />
        <Stack.Screen
          name="Guide"
          component={GuideScreen}
          options={{ headerShown: false, presentation: 'modal' }}
        />
        <Stack.Screen
          name="Privacy"
          component={PrivacyScreen}
          options={{ title: t('nav.privacy') }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

function App(): React.JSX.Element {
  return (
    <SafeAreaProvider>
      <PaperProvider theme={theme}>
        <DeviceProvider>
          <EntitlementProvider>
            <StatusBar barStyle="light-content" backgroundColor={colors.background} />
            <Root />
          </EntitlementProvider>
        </DeviceProvider>
      </PaperProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  blank: {
    flex: 1,
    backgroundColor: colors.background,
  },
});

export default App;
