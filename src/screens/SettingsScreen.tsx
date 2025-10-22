/**
 * Settings Screen
 * App settings and preferences
 */

import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import {
  List,
  Switch,
  Divider,
  Title,
  useTheme,
  Button,
  Card,
} from 'react-native-paper';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../App';
import { useDevice } from '../context/DeviceContext';

type SettingsScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Settings'>;

interface Props {
  navigation: SettingsScreenNavigationProp;
}

const SettingsScreen: React.FC<Props> = ({ navigation }) => {
  const theme = useTheme();
  const { settings, updateSettings, savedDevices } = useDevice();

  const handleToggleVibration = () => {
    updateSettings({ vibrationEnabled: !settings.vibrationEnabled });
  };

  const handleToggleSound = () => {
    updateSettings({ soundEnabled: !settings.soundEnabled });
  };

  const handleToggleAutoConnect = () => {
    updateSettings({ autoConnect: !settings.autoConnect });
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Card style={styles.section}>
        <Card.Content>
          <Title>App Settings</Title>

          <List.Item
            title="Vibration Feedback"
            description="Vibrate when buttons are pressed"
            left={(props) => <List.Icon {...props} icon="vibrate" />}
            right={() => (
              <Switch value={settings.vibrationEnabled} onValueChange={handleToggleVibration} />
            )}
          />

          <Divider />

          <List.Item
            title="Sound Feedback"
            description="Play sound when buttons are pressed"
            left={(props) => <List.Icon {...props} icon="volume-high" />}
            right={() => (
              <Switch value={settings.soundEnabled} onValueChange={handleToggleSound} />
            )}
          />

          <Divider />

          <List.Item
            title="Auto Connect"
            description="Automatically connect to last device"
            left={(props) => <List.Icon {...props} icon="connection" />}
            right={() => (
              <Switch value={settings.autoConnect} onValueChange={handleToggleAutoConnect} />
            )}
          />
        </Card.Content>
      </Card>

      <Card style={styles.section}>
        <Card.Content>
          <Title>Device Information</Title>

          <List.Item
            title="Saved Devices"
            description={`${savedDevices.length} device(s) saved`}
            left={(props) => <List.Icon {...props} icon="devices" />}
          />

          {settings.lastDevice && (
            <>
              <Divider />
              <List.Item
                title="Last Connected"
                description={`${settings.lastDevice.name} (${settings.lastDevice.ip})`}
                left={(props) => <List.Icon {...props} icon="history" />}
              />
            </>
          )}
        </Card.Content>
      </Card>

      <Card style={styles.section}>
        <Card.Content>
          <Title>About</Title>

          <List.Item
            title="Version"
            description="1.0.0"
            left={(props) => <List.Icon {...props} icon="information" />}
          />

          <Divider />

          <List.Item
            title="Support"
            description="Report issues on GitHub"
            left={(props) => <List.Icon {...props} icon="help-circle" />}
          />

          <Divider />

          <List.Item
            title="License"
            description="MIT License"
            left={(props) => <List.Icon {...props} icon="file-document" />}
          />
        </Card.Content>
      </Card>

      <View style={styles.footer}>
        <Button
          mode="text"
          onPress={() => navigation.navigate('Home')}
          icon="home">
          Back to Home
        </Button>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  section: {
    margin: 16,
    marginBottom: 0,
  },
  footer: {
    padding: 20,
    alignItems: 'center',
  },
});

export default SettingsScreen;
