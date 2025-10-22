/**
 * Enhanced Remote Screen with Tabs
 * Multiple control modes: Standard, Gesture, Touchpad, Keyboard
 */

import React, { useState } from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import { TabView, SceneMap, TabBar } from 'react-native-tab-view';
import { useTheme, FAB, Portal } from 'react-native-paper';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../App';
import { useDevice } from '../context/DeviceContext';
import MAGService from '../services/MAGService';

// Import remote mode components
import RemoteScreen from './RemoteScreen';
import { GestureRemote, Touchpad } from '../components/GestureRemote';
import { VirtualKeyboard } from '../components/VirtualKeyboard';
import { RemoteMode, MAGCommand } from '../types';

type EnhancedRemoteScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Remote'>;
type EnhancedRemoteScreenRouteProp = RouteProp<RootStackParamList, 'Remote'>;

interface Props {
  navigation: EnhancedRemoteScreenNavigationProp;
  route: EnhancedRemoteScreenRouteProp;
}

const EnhancedRemoteScreen: React.FC<Props> = ({ navigation, route }) => {
  const layout = useWindowDimensions();
  const theme = useTheme();
  const { settings } = useDevice();

  const [index, setIndex] = useState(0);
  const [fabOpen, setFabOpen] = useState(false);

  const routes = [
    { key: 'standard', title: 'Remote', icon: 'remote' },
    { key: 'gesture', title: 'Gesture', icon: 'gesture-swipe' },
    { key: 'touchpad', title: 'Touchpad', icon: 'cursor-move' },
    { key: 'keyboard', title: 'Keyboard', icon: 'keyboard' },
  ];

  const handleCommand = async (command: MAGCommand) => {
    await MAGService.sendCommand(command);
  };

  const StandardRoute = () => (
    <RemoteScreen navigation={navigation} route={route} />
  );

  const GestureRoute = () => (
    <View style={styles.modeContainer}>
      <GestureRemote
        onCommand={handleCommand}
        vibrationEnabled={settings.vibrationEnabled}
      />
    </View>
  );

  const TouchpadRoute = () => (
    <View style={styles.modeContainer}>
      <Touchpad
        onCommand={handleCommand}
        vibrationEnabled={settings.vibrationEnabled}
      />
    </View>
  );

  const KeyboardRoute = () => (
    <View style={styles.modeContainer}>
      <VirtualKeyboard
        onCommand={handleCommand}
        vibrationEnabled={settings.vibrationEnabled}
      />
    </View>
  );

  const renderScene = SceneMap({
    standard: StandardRoute,
    gesture: GestureRoute,
    touchpad: TouchpadRoute,
    keyboard: KeyboardRoute,
  });

  const renderTabBar = (props: any) => (
    <TabBar
      {...props}
      indicatorStyle={{ backgroundColor: theme.colors.primary }}
      style={{ backgroundColor: theme.colors.surface }}
      labelStyle={{ fontSize: 12, fontWeight: 'bold' }}
      iconStyle={{ width: 24, height: 24 }}
      renderIcon={({ route: tabRoute, color }) => {
        const iconMap: { [key: string]: string } = {
          standard: '📱',
          gesture: '👆',
          touchpad: '🖱️',
          keyboard: '⌨️',
        };
        return <span style={{ fontSize: 20 }}>{iconMap[tabRoute.key]}</span>;
      }}
    />
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <TabView
        navigationState={{ index, routes }}
        renderScene={renderScene}
        renderTabBar={renderTabBar}
        onIndexChange={setIndex}
        initialLayout={{ width: layout.width }}
      />

      <Portal>
        <FAB.Group
          open={fabOpen}
          visible
          icon={fabOpen ? 'close' : 'menu'}
          actions={[
            {
              icon: 'star',
              label: 'Quick Actions',
              onPress: () => navigation.navigate('QuickActions'),
            },
            {
              icon: 'lightning-bolt',
              label: 'Macros',
              onPress: () => navigation.navigate('Macros'),
            },
            {
              icon: 'cog',
              label: 'Settings',
              onPress: () => navigation.navigate('Settings'),
            },
          ]}
          onStateChange={({ open }) => setFabOpen(open)}
          style={styles.fab}
        />
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  modeContainer: {
    flex: 1,
    padding: 16,
  },
  fab: {
    position: 'absolute',
    bottom: 16,
    right: 16,
  },
});

export default EnhancedRemoteScreen;
