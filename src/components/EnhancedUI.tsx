/**
 * Enhanced UI Components
 * Reusable components with beautiful animations and effects
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Animated,
  ViewStyle,
  Vibration,
} from 'react-native';
import { Text, useTheme, Surface } from 'react-native-paper';
import { MAGCommand } from '../types';

interface GradientButtonProps {
  icon?: string;
  label?: string;
  command: MAGCommand;
  onPress: (command: MAGCommand) => void;
  size?: 'small' | 'medium' | 'large';
  colors?: string[];
  disabled?: boolean;
  vibration?: boolean;
}

export const GradientButton: React.FC<GradientButtonProps> = ({
  icon,
  label,
  command,
  onPress,
  size = 'medium',
  colors,
  disabled = false,
  vibration = true,
}) => {
  const theme = useTheme();
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  const sizeMap = {
    small: { width: 55, height: 55, fontSize: 14, iconSize: 20 },
    medium: { width: 75, height: 75, fontSize: 16, iconSize: 26 },
    large: { width: 95, height: 95, fontSize: 18, iconSize: 30 },
  };

  const dimensions = sizeMap[size];

  useEffect(() => {
    // Subtle glow animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [glowAnim]);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.9,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 3,
      tension: 40,
      useNativeDriver: true,
    }).start();

    if (vibration) {
      Vibration.vibrate(30);
    }

    onPress(command);
  };

  const backgroundColor = colors?.[0] || theme.colors.surface;
  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={[
        {
          transform: [{ scale: scaleAnim }],
          opacity: disabled ? 0.5 : 1,
        },
      ]}>
      <TouchableOpacity
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        activeOpacity={0.8}>
        <Surface
          style={[
            styles.button,
            {
              width: dimensions.width,
              height: dimensions.height,
              backgroundColor,
            },
          ]}>
          {label ? (
            <Text
              style={[
                styles.buttonText,
                { fontSize: dimensions.fontSize, color: theme.colors.onSurface },
              ]}>
              {label}
            </Text>
          ) : (
            <Text style={[styles.buttonText, { fontSize: dimensions.iconSize }]}>
              {icon || '●'}
            </Text>
          )}
        </Surface>
        <Animated.View
          style={[
            styles.glow,
            {
              width: dimensions.width + 10,
              height: dimensions.height + 10,
              opacity: glowOpacity,
            },
          ]}
        />
      </TouchableOpacity>
    </Animated.View>
  );
};

interface QuickActionButtonProps {
  icon: string;
  label: string;
  onPress: () => void;
  color?: string;
}

export const QuickActionButton: React.FC<QuickActionButtonProps> = ({
  icon,
  label,
  onPress,
  color,
}) => {
  const theme = useTheme();
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
    onPress();
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity onPressIn={handlePressIn} onPressOut={handlePressOut}>
        <Surface style={[styles.quickAction, { backgroundColor: color || theme.colors.surface }]}>
          <Text style={styles.quickActionIcon}>{icon}</Text>
          <Text style={styles.quickActionLabel}>{label}</Text>
        </Surface>
      </TouchableOpacity>
    </Animated.View>
  );
};

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  icon?: string;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({ title, subtitle, icon }) => {
  const theme = useTheme();

  return (
    <View style={styles.sectionHeader}>
      {icon && <Text style={styles.sectionIcon}>{icon}</Text>}
      <View>
        <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>{title}</Text>
        {subtitle && <Text style={styles.sectionSubtitle}>{subtitle}</Text>}
      </View>
    </View>
  );
};

interface ConnectionStatusProps {
  connected: boolean;
  deviceName?: string;
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ connected, deviceName }) => {
  const theme = useTheme();
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (connected) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [connected, pulseAnim]);

  return (
    <View style={styles.connectionStatus}>
      <Animated.View
        style={[
          styles.statusDot,
          {
            backgroundColor: connected ? '#4CAF50' : '#FF6B6B',
            transform: [{ scale: pulseAnim }],
          },
        ]}
      />
      <Text style={styles.statusText}>
        {connected ? `Connected${deviceName ? ` to ${deviceName}` : ''}` : 'Disconnected'}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#00A8E8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  buttonText: {
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  glow: {
    position: 'absolute',
    top: -5,
    left: -5,
    borderRadius: 16,
    backgroundColor: '#00A8E8',
    zIndex: -1,
  },
  quickAction: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    minWidth: 100,
    elevation: 4,
  },
  quickActionIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  quickActionLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
    paddingHorizontal: 8,
  },
  sectionIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  sectionSubtitle: {
    fontSize: 12,
    opacity: 0.7,
    marginTop: 2,
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(0, 168, 232, 0.1)',
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
