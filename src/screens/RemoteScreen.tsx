/**
 * Remote Screen
 * Main remote control interface
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Vibration,
  Alert,
  ScrollView,
} from 'react-native';
import {
  useTheme,
  IconButton,
  Text,
  Portal,
  Snackbar,
  Surface,
} from 'react-native-paper';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../App';
import { useDevice } from '../context/DeviceContext';
import { MAGCommand } from '../types';
import MAGService from '../services/MAGService';

type RemoteScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Remote'>;
type RemoteScreenRouteProp = RouteProp<RootStackParamList, 'Remote'>;

interface Props {
  navigation: RemoteScreenNavigationProp;
  route: RemoteScreenRouteProp;
}

interface RemoteButtonProps {
  icon?: string;
  label?: string;
  command: MAGCommand;
  onPress: (command: MAGCommand) => void;
  size?: 'small' | 'medium' | 'large';
  color?: string;
}

const RemoteButton: React.FC<RemoteButtonProps> = ({
  icon,
  label,
  command,
  onPress,
  size = 'medium',
  color,
}) => {
  const theme = useTheme();

  const sizeMap = {
    small: { width: 50, height: 50, fontSize: 14, iconSize: 20 },
    medium: { width: 70, height: 70, fontSize: 16, iconSize: 24 },
    large: { width: 90, height: 90, fontSize: 18, iconSize: 28 },
  };

  const dimensions = sizeMap[size];
  const backgroundColor = color || theme.colors.surface;

  return (
    <TouchableOpacity
      style={[
        styles.button,
        { width: dimensions.width, height: dimensions.height, backgroundColor },
      ]}
      onPress={() => onPress(command)}
      activeOpacity={0.7}>
      {icon ? (
        <IconButton icon={icon} size={dimensions.iconSize} iconColor={theme.colors.onSurface} />
      ) : (
        <Text style={[styles.buttonText, { fontSize: dimensions.fontSize }]}>{label}</Text>
      )}
    </TouchableOpacity>
  );
};

const RemoteScreen: React.FC<Props> = ({ navigation, route }) => {
  const theme = useTheme();
  const { settings } = useDevice();
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [isConnected, setIsConnected] = useState(true);

  useEffect(() => {
    // Check connection status
    const connected = MAGService.isConnected();
    setIsConnected(connected);

    if (!connected) {
      Alert.alert(
        'Connection Lost',
        'Lost connection to the MAG device. Please reconnect.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    }
  }, [navigation]);

  const handleButtonPress = async (command: MAGCommand) => {
    if (!isConnected) {
      showMessage('Not connected to device');
      return;
    }

    // Haptic feedback
    if (settings.vibrationEnabled) {
      Vibration.vibrate(50);
    }

    // Send command
    const success = await MAGService.sendCommand(command);

    if (!success) {
      showMessage('Failed to send command');
    }
  };

  const showMessage = (message: string) => {
    setSnackbarMessage(message);
    setSnackbarVisible(true);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Power and Menu Section */}
        <View style={styles.section}>
          <View style={styles.row}>
            <RemoteButton
              icon="power"
              command={MAGCommand.POWER}
              onPress={handleButtonPress}
              size="medium"
              color="#FF6B6B"
            />
            <RemoteButton
              icon="cog"
              command={MAGCommand.SETTINGS}
              onPress={handleButtonPress}
              size="medium"
            />
            <RemoteButton
              icon="menu"
              command={MAGCommand.MENU}
              onPress={handleButtonPress}
              size="medium"
            />
          </View>
        </View>

        {/* Navigation D-Pad */}
        <Surface style={styles.dpadSection}>
          <Text style={styles.sectionTitle}>Navigation</Text>
          <View style={styles.dpad}>
            <View style={styles.dpadRow}>
              <View style={styles.dpadSpacer} />
              <RemoteButton
                icon="chevron-up"
                command={MAGCommand.UP}
                onPress={handleButtonPress}
                size="large"
              />
              <View style={styles.dpadSpacer} />
            </View>
            <View style={styles.dpadRow}>
              <RemoteButton
                icon="chevron-left"
                command={MAGCommand.LEFT}
                onPress={handleButtonPress}
                size="large"
              />
              <RemoteButton
                icon="circle"
                command={MAGCommand.OK}
                onPress={handleButtonPress}
                size="large"
                color={theme.colors.primary}
              />
              <RemoteButton
                icon="chevron-right"
                command={MAGCommand.RIGHT}
                onPress={handleButtonPress}
                size="large"
              />
            </View>
            <View style={styles.dpadRow}>
              <View style={styles.dpadSpacer} />
              <RemoteButton
                icon="chevron-down"
                command={MAGCommand.DOWN}
                onPress={handleButtonPress}
                size="large"
              />
              <View style={styles.dpadSpacer} />
            </View>
          </View>

          <View style={[styles.row, styles.navButtons]}>
            <RemoteButton
              icon="arrow-left"
              command={MAGCommand.BACK}
              onPress={handleButtonPress}
              size="medium"
            />
            <RemoteButton
              icon="exit-to-app"
              command={MAGCommand.EXIT}
              onPress={handleButtonPress}
              size="medium"
            />
            <RemoteButton
              icon="information"
              command={MAGCommand.INFO}
              onPress={handleButtonPress}
              size="medium"
            />
          </View>
        </Surface>

        {/* Playback Controls */}
        <Surface style={styles.section}>
          <Text style={styles.sectionTitle}>Playback</Text>
          <View style={styles.row}>
            <RemoteButton
              icon="skip-previous"
              command={MAGCommand.PREV}
              onPress={handleButtonPress}
              size="medium"
            />
            <RemoteButton
              icon="rewind"
              command={MAGCommand.REWIND}
              onPress={handleButtonPress}
              size="medium"
            />
            <RemoteButton
              icon="play-pause"
              command={MAGCommand.PLAY}
              onPress={handleButtonPress}
              size="medium"
              color={theme.colors.primary}
            />
            <RemoteButton
              icon="fast-forward"
              command={MAGCommand.FORWARD}
              onPress={handleButtonPress}
              size="medium"
            />
            <RemoteButton
              icon="skip-next"
              command={MAGCommand.NEXT}
              onPress={handleButtonPress}
              size="medium"
            />
          </View>
          <View style={styles.row}>
            <RemoteButton
              icon="stop"
              command={MAGCommand.STOP}
              onPress={handleButtonPress}
              size="medium"
            />
            <RemoteButton
              icon="record"
              command={MAGCommand.REC}
              onPress={handleButtonPress}
              size="medium"
              color="#FF6B6B"
            />
          </View>
        </Surface>

        {/* Volume and Channel */}
        <View style={styles.section}>
          <View style={styles.row}>
            <View style={styles.volumeGroup}>
              <Text style={styles.groupLabel}>Volume</Text>
              <RemoteButton
                icon="plus"
                command={MAGCommand.VOL_UP}
                onPress={handleButtonPress}
                size="medium"
              />
              <RemoteButton
                icon="volume-mute"
                command={MAGCommand.MUTE}
                onPress={handleButtonPress}
                size="medium"
              />
              <RemoteButton
                icon="minus"
                command={MAGCommand.VOL_DOWN}
                onPress={handleButtonPress}
                size="medium"
              />
            </View>

            <View style={styles.channelGroup}>
              <Text style={styles.groupLabel}>Channel</Text>
              <RemoteButton
                icon="chevron-up"
                command={MAGCommand.CH_UP}
                onPress={handleButtonPress}
                size="medium"
              />
              <RemoteButton
                icon="star"
                command={MAGCommand.FAV}
                onPress={handleButtonPress}
                size="medium"
              />
              <RemoteButton
                icon="chevron-down"
                command={MAGCommand.CH_DOWN}
                onPress={handleButtonPress}
                size="medium"
              />
            </View>
          </View>
        </View>

        {/* Number Pad */}
        <Surface style={styles.section}>
          <Text style={styles.sectionTitle}>Numbers</Text>
          <View style={styles.numberPad}>
            <View style={styles.row}>
              <RemoteButton
                label="1"
                command={MAGCommand.NUM_1}
                onPress={handleButtonPress}
                size="medium"
              />
              <RemoteButton
                label="2"
                command={MAGCommand.NUM_2}
                onPress={handleButtonPress}
                size="medium"
              />
              <RemoteButton
                label="3"
                command={MAGCommand.NUM_3}
                onPress={handleButtonPress}
                size="medium"
              />
            </View>
            <View style={styles.row}>
              <RemoteButton
                label="4"
                command={MAGCommand.NUM_4}
                onPress={handleButtonPress}
                size="medium"
              />
              <RemoteButton
                label="5"
                command={MAGCommand.NUM_5}
                onPress={handleButtonPress}
                size="medium"
              />
              <RemoteButton
                label="6"
                command={MAGCommand.NUM_6}
                onPress={handleButtonPress}
                size="medium"
              />
            </View>
            <View style={styles.row}>
              <RemoteButton
                label="7"
                command={MAGCommand.NUM_7}
                onPress={handleButtonPress}
                size="medium"
              />
              <RemoteButton
                label="8"
                command={MAGCommand.NUM_8}
                onPress={handleButtonPress}
                size="medium"
              />
              <RemoteButton
                label="9"
                command={MAGCommand.NUM_9}
                onPress={handleButtonPress}
                size="medium"
              />
            </View>
            <View style={styles.row}>
              <View style={{ width: 70 }} />
              <RemoteButton
                label="0"
                command={MAGCommand.NUM_0}
                onPress={handleButtonPress}
                size="medium"
              />
              <View style={{ width: 70 }} />
            </View>
          </View>
        </Surface>

        {/* Color Buttons */}
        <View style={styles.section}>
          <View style={styles.row}>
            <RemoteButton
              icon="square"
              command={MAGCommand.RED}
              onPress={handleButtonPress}
              size="small"
              color="#FF0000"
            />
            <RemoteButton
              icon="square"
              command={MAGCommand.GREEN}
              onPress={handleButtonPress}
              size="small"
              color="#00FF00"
            />
            <RemoteButton
              icon="square"
              command={MAGCommand.YELLOW}
              onPress={handleButtonPress}
              size="small"
              color="#FFFF00"
            />
            <RemoteButton
              icon="square"
              command={MAGCommand.BLUE}
              onPress={handleButtonPress}
              size="small"
              color="#0000FF"
            />
          </View>
        </View>

        {/* Additional Functions */}
        <View style={styles.section}>
          <View style={styles.row}>
            <RemoteButton
              icon="web"
              command={MAGCommand.PORTAL}
              onPress={handleButtonPress}
              size="small"
            />
            <RemoteButton
              icon="usb"
              command={MAGCommand.USB}
              onPress={handleButtonPress}
              size="small"
            />
            <RemoteButton
              icon="radio"
              command={MAGCommand.TV_RADIO}
              onPress={handleButtonPress}
              size="small"
            />
            <RemoteButton
              icon="waveform"
              command={MAGCommand.AUDIO}
              onPress={handleButtonPress}
              size="small"
            />
            <RemoteButton
              icon="closed-caption"
              command={MAGCommand.SUBTITLE}
              onPress={handleButtonPress}
              size="small"
            />
          </View>
        </View>
      </ScrollView>

      <Portal>
        <Snackbar
          visible={snackbarVisible}
          onDismiss={() => setSnackbarVisible(false)}
          duration={2000}>
          {snackbarMessage}
        </Snackbar>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 20,
    padding: 10,
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
    opacity: 0.8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    marginVertical: 5,
  },
  button: {
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  buttonText: {
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  dpadSection: {
    marginBottom: 20,
    padding: 15,
    borderRadius: 12,
  },
  dpad: {
    alignItems: 'center',
    marginBottom: 10,
  },
  dpadRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dpadSpacer: {
    width: 90,
  },
  navButtons: {
    marginTop: 10,
  },
  numberPad: {
    alignItems: 'center',
  },
  volumeGroup: {
    alignItems: 'center',
    gap: 10,
  },
  channelGroup: {
    alignItems: 'center',
    gap: 10,
  },
  groupLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 5,
    opacity: 0.8,
  },
});

export default RemoteScreen;
