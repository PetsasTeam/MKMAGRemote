/**
 * Macros Screen
 * Manage and execute command macros
 */

import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Alert,
} from 'react-native';
import {
  Card,
  Title,
  Paragraph,
  Button,
  FAB,
  useTheme,
  Portal,
  Dialog,
  TextInput,
  IconButton,
  Chip,
} from 'react-native-paper';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../App';
import { useDevice } from '../context/DeviceContext';
import { Macro, MAGCommand } from '../types';
import MacroService from '../services/MacroService';

type MacrosScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Macros'>;

interface Props {
  navigation: MacrosScreenNavigationProp;
}

const MacrosScreen: React.FC<Props> = ({ navigation }) => {
  const theme = useTheme();
  const { settings, updateSettings } = useDevice();
  const [executing, setExecuting] = useState<string | null>(null);
  const [showDialog, setShowDialog] = useState(false);

  const macros = settings.macros || [];

  const handleExecuteMacro = async (macro: Macro) => {
    setExecuting(macro.id);

    const success = await MacroService.executeMacro(macro);

    if (success) {
      Alert.alert('Success', `Macro "${macro.name}" executed successfully`);
    } else {
      Alert.alert('Error', `Failed to execute macro "${macro.name}"`);
    }

    setExecuting(null);
  };

  const handleDeleteMacro = (macroId: string) => {
    Alert.alert(
      'Delete Macro',
      'Are you sure you want to delete this macro?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            const updated = macros.filter((m) => m.id !== macroId);
            updateSettings({ macros: updated });
          },
        },
      ]
    );
  };

  const loadDefaultMacros = () => {
    const defaultMacros = MacroService.getDefaultMacros();
    updateSettings({ macros: [...macros, ...defaultMacros] });
    Alert.alert('Success', `Added ${defaultMacros.length} default macros`);
  };

  const renderMacroCard = ({ item }: { item: Macro }) => (
    <Card style={styles.card}>
      <Card.Content>
        <View style={styles.cardHeader}>
          <View style={styles.iconContainer}>
            <Title style={styles.icon}>{item.icon}</Title>
          </View>
          <View style={styles.cardInfo}>
            <Title>{item.name}</Title>
            <Paragraph>{item.description}</Paragraph>
            <View style={styles.commandInfo}>
              <Chip icon="layers" compact>
                {item.commands.length} commands
              </Chip>
              <Chip icon="timer" compact style={styles.delayChip}>
                {item.delay || 300}ms delay
              </Chip>
            </View>
          </View>
          <IconButton
            icon="delete"
            size={24}
            onPress={() => handleDeleteMacro(item.id)}
          />
        </View>
      </Card.Content>
      <Card.Actions>
        <Button
          mode="contained"
          onPress={() => handleExecuteMacro(item)}
          loading={executing === item.id}
          disabled={executing !== null}
          icon="play">
          {executing === item.id ? 'Executing...' : 'Run'}
        </Button>
      </Card.Actions>
    </Card>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {macros.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Title>No Macros Yet</Title>
          <Paragraph style={styles.emptyText}>
            Macros let you execute multiple commands in sequence
          </Paragraph>
          <Button
            mode="contained"
            onPress={loadDefaultMacros}
            style={styles.emptyButton}
            icon="download">
            Load Default Macros
          </Button>
        </View>
      ) : (
        <>
          <View style={styles.header}>
            <Title>Macros</Title>
            <Paragraph>Execute command sequences with one tap</Paragraph>
          </View>
          <FlatList
            data={macros}
            renderItem={renderMacroCard}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContainer}
          />
        </>
      )}

      {macros.length > 0 && (
        <FAB
          icon="plus"
          style={styles.fab}
          onPress={loadDefaultMacros}
          label="Add More"
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingBottom: 10,
  },
  listContainer: {
    padding: 16,
  },
  card: {
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconContainer: {
    marginRight: 12,
  },
  icon: {
    fontSize: 40,
  },
  cardInfo: {
    flex: 1,
  },
  commandInfo: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  delayChip: {
    backgroundColor: 'rgba(0, 168, 232, 0.2)',
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
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
});

export default MacrosScreen;
