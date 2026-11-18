/**
 * Settings: remote preferences, purchase status, help and about.
 */
import React from 'react';
import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { Icon } from 'react-native-paper';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../App';
import { useDevice } from '../context/DeviceContext';
import { useEntitlement } from '../context/EntitlementContext';
import { APP_VERSION, SUPPORT_EMAIL } from '../config';
import { colors, radius, spacing, type } from '../theme/tokens';
import { language, t } from '../i18n';

type SettingsScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Settings'>;

interface Props {
  navigation: SettingsScreenNavigationProp;
}

interface RowProps {
  icon: string;
  title: string;
  subtitle?: string;
  value?: string;
  onPress?: () => void;
  toggle?: { value: boolean; onChange: (value: boolean) => void };
  last?: boolean;
}

const Row: React.FC<RowProps> = ({ icon, title, subtitle, value, onPress, toggle, last }) => (
  <Pressable
    onPress={toggle ? () => toggle.onChange(!toggle.value) : onPress}
    disabled={!onPress && !toggle}
    accessibilityRole={toggle ? 'switch' : onPress ? 'button' : undefined}
    accessibilityState={toggle ? { checked: toggle.value } : undefined}
    style={({ pressed }) => [styles.row, pressed && (onPress || toggle) && styles.rowPressed]}>
    <View style={styles.rowIcon}>
      <Icon source={icon} size={18} color={colors.accentText} />
    </View>
    <View style={[styles.rowBody, !last && styles.rowDivider]}>
      <View style={styles.rowText}>
        <Text style={styles.rowTitle}>{title}</Text>
        {subtitle ? <Text style={styles.rowSubtitle}>{subtitle}</Text> : null}
      </View>
      {value ? <Text style={styles.rowValue}>{value}</Text> : null}
      {toggle ? (
        <Switch
          value={toggle.value}
          onValueChange={toggle.onChange}
          trackColor={{ true: colors.accent, false: colors.control }}
        />
      ) : onPress ? (
        <Icon source="chevron-right" size={20} color={colors.textMuted} />
      ) : null}
    </View>
  </Pressable>
);

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <View style={styles.section}>
    <Text style={styles.sectionLabel}>{title}</Text>
    <View style={styles.card}>{children}</View>
  </View>
);

const SettingsScreen: React.FC<Props> = ({ navigation }) => {
  const { settings, updateSettings, savedDevices } = useDevice();
  const { entitlement, restore } = useEntitlement();

  const trialEnds =
    entitlement.status === 'trial'
      ? new Date(entitlement.endsAt).toLocaleString(language() === 'el' ? 'el-GR' : undefined, {
          weekday: 'short',
          hour: 'numeric',
          minute: '2-digit',
        })
      : '';

  const onRestore = async () => {
    const found = await restore();
    Alert.alert(found ? t('settings.restored') : t('settings.nothingToRestore'));
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Section title={t('settings.remote')}>
        <Row
          icon="vibrate"
          title={t('settings.haptics')}
          toggle={{
            value: settings.vibrationEnabled !== false,
            onChange: value => updateSettings({ vibrationEnabled: value }),
          }}
        />
        <Row
          icon="volume-high"
          title={t('settings.volumeButtons')}
          subtitle={t('settings.volumeButtonsHint')}
          toggle={{
            value: settings.volumeButtons !== false,
            onChange: value => updateSettings({ volumeButtons: value }),
          }}
          last
        />
      </Section>

      <Section title={t('settings.purchase')}>
        {entitlement.status === 'unlocked' ? (
          <Row
            icon="check-decagram"
            title={t('settings.unlocked')}
            subtitle={t('settings.unlockedHint')}
          />
        ) : entitlement.status === 'trial' ? (
          <Row
            icon="timer-sand"
            title={t('settings.trial')}
            subtitle={t('settings.trialHint', { when: trialEnds })}
          />
        ) : null}
        <Row icon="restore" title={t('settings.restore')} onPress={onRestore} last />
      </Section>

      <Section title={t('settings.help')}>
        <Row
          icon="book-open-outline"
          title={t('settings.guide')}
          onPress={() => navigation.navigate('Guide')}
        />
        {SUPPORT_EMAIL !== '' && (
          <Row
            icon="email-outline"
            title={t('settings.support')}
            onPress={() =>
              Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('BoxPilot')}`)
            }
          />
        )}
        <Row
          icon="shield-lock-outline"
          title={t('settings.privacy')}
          onPress={() => navigation.navigate('Privacy')}
          last
        />
      </Section>

      <Section title={t('settings.about')}>
        <Row icon="information-outline" title={t('settings.version')} value={APP_VERSION} />
        <Row
          icon="television"
          title={t('settings.boxes')}
          value={String(savedDevices.length)}
          last
        />
      </Section>

      <Text style={styles.disclaimer}>{t('settings.disclaimer')}</Text>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl * 2,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionLabel: {
    ...type.label,
    fontWeight: '600',
    marginHorizontal: spacing.sm,
    marginBottom: spacing.sm,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: spacing.md,
  },
  rowPressed: {
    backgroundColor: colors.control,
  },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  rowBody: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingRight: spacing.md,
    minHeight: 52,
  },
  rowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rowText: {
    flex: 1,
  },
  rowTitle: {
    ...type.body,
  },
  rowSubtitle: {
    ...type.caption,
    marginTop: 2,
    lineHeight: 16,
  },
  rowValue: {
    color: colors.textSecondary,
    fontSize: 15,
  },
  disclaimer: {
    ...type.caption,
    textAlign: 'center',
    lineHeight: 17,
    paddingHorizontal: spacing.lg,
  },
});

export default SettingsScreen;
