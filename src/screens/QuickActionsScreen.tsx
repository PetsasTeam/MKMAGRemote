/**
 * Quick Actions Screen
 * Manage favorite commands and shortcuts
 */

import React from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import {
  Card,
  Title,
  Paragraph,
  Button,
  useTheme,
  Surface,
  Text,
} from 'react-native-paper';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../App';
import { useDevice } from '../context/DeviceContext';
import { QuickAction, AppShortcut } from '../types';
import MAGService from '../services/MAGService';
import MacroService from '../services/MacroService';
import { QuickActionButton } from '../components/EnhancedUI';

type QuickActionsScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'QuickActions'
>;

interface Props {
  navigation: QuickActionsScreenNavigationProp;
}

const QuickActionsScreen: React.FC<Props> = ({ navigation }) => {
  const theme = useTheme();
  const { settings, updateSettings } = useDevice();

  const quickActions = settings.quickActions || [];
  const appShortcuts = settings.appShortcuts || [];

  const handleQuickAction = async (action: QuickAction) => {
    await MAGService.sendCommand(action.command);
  };

  const handleAppShortcut = async (shortcut: AppShortcut) => {
    // Navigate to app or channel
    // This is a placeholder - actual implementation would depend on MAG box API
    console.log('Launch app:', shortcut.name);
  };

  const loadDefaults = () => {
    const defaultActions = MacroService.getDefaultQuickActions();
    const defaultShortcuts = MacroService.getDefaultAppShortcuts();
    updateSettings({
      quickActions: defaultActions,
      appShortcuts: defaultShortcuts,
    });
  };

  if (quickActions.length === 0 && appShortcuts.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.emptyContainer}>
          <Title>No Quick Actions Yet</Title>
          <Paragraph style={styles.emptyText}>
            Quick actions give you instant access to your favorite commands
          </Paragraph>
          <Button
            mode="contained"
            onPress={loadDefaults}
            style={styles.emptyButton}
            icon="download">
            Load Default Actions
          </Button>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.scrollContent}>
      {quickActions.length > 0 && (
        <Card style={styles.section}>
          <Card.Content>
            <Title>Quick Actions</Title>
            <Paragraph style={styles.subtitle}>
              One-tap access to common controls
            </Paragraph>
            <View style={styles.grid}>
              {quickActions.map((action) => (
                <QuickActionButton
                  key={action.id}
                  icon={action.icon}
                  label={action.name}
                  onPress={() => handleQuickAction(action)}
                  color={action.color}
                />
              ))}
            </View>
          </Card.Content>
        </Card>
      )}

      {appShortcuts.length > 0 && (
        <Card style={styles.section}>
          <Card.Content>
            <Title>App Shortcuts</Title>
            <Paragraph style={styles.subtitle}>
              Quick launch your favorite apps
            </Paragraph>
            <View style={styles.grid}>
              {appShortcuts.map((shortcut) => (
                <QuickActionButton
                  key={shortcut.id}
                  icon={shortcut.icon}
                  label={shortcut.name}
                  onPress={() => handleAppShortcut(shortcut)}
                />
              ))}
            </View>
          </Card.Content>
        </Card>
      )}

      <View style={styles.footer}>
        <Button mode="outlined" onPress={loadDefaults} icon="refresh">
          Reset to Defaults
        </Button>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  section: {
    marginBottom: 16,
  },
  subtitle: {
    opacity: 0.7,
    marginBottom: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 20,
    opacity: 0.7,
  },
  emptyButton: {
    marginTop: 10,
  },
  footer: {
    marginTop: 20,
    marginBottom: 40,
  },
});

export default QuickActionsScreen;
