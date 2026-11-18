/**
 * Shown while BoxPilot is locked: before the free trial starts and after it
 * ends. Offers the 1-day trial (when unused), the one-time unlock and restore.
 */
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Button, Icon } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEntitlement } from '../context/EntitlementContext';
import PrivacyScreen from './PrivacyScreen';
import { TERMS_URL } from '../config';
import { colors, radius, spacing, type } from '../theme/tokens';
import { t } from '../i18n';

const FEATURES = [
  { icon: 'remote', text: t('paywall.feature1') },
  { icon: 'keyboard-outline', text: t('paywall.feature2') },
  { icon: 'lightning-bolt-outline', text: t('paywall.feature3') },
  { icon: 'television', text: t('paywall.feature4') },
];

const PaywallScreen: React.FC = () => {
  const { entitlement, price, busy, error, startTrial, unlock, restore, devSkip } =
    useEntitlement();
  const [showPrivacy, setShowPrivacy] = useState(false);
  const insets = useSafeAreaInsets();
  const expired = entitlement.status === 'expired';
  const trialAvailable = entitlement.status === 'trialAvailable';

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.iconCircle}>
          <Icon
            source={expired ? 'timer-sand-complete' : 'remote-tv'}
            size={44}
            color={colors.accentText}
          />
        </View>
        <Text style={styles.title}>{expired ? t('paywall.expiredTitle') : t('paywall.title')}</Text>
        <Text style={styles.subtitle}>
          {expired ? t('paywall.expiredBody') : t('paywall.subtitle')}
        </Text>

        <View style={styles.features}>
          {FEATURES.map(feature => (
            <View key={feature.icon} style={styles.feature}>
              <View style={styles.featureIcon}>
                <Icon source={feature.icon} size={18} color={colors.accentText} />
              </View>
              <Text style={styles.featureText}>{feature.text}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        {error !== '' && <Text style={styles.error}>{error}</Text>}

        {trialAvailable && (
          <Button
            mode="contained"
            onPress={startTrial}
            disabled={busy}
            style={styles.button}
            contentStyle={styles.buttonContent}
            labelStyle={styles.buttonLabel}>
            {t('paywall.startTrial')}
          </Button>
        )}
        <Button
          mode={trialAvailable ? 'outlined' : 'contained'}
          onPress={unlock}
          disabled={busy}
          textColor={trialAvailable ? colors.text : undefined}
          style={[styles.button, trialAvailable && styles.secondary]}
          contentStyle={styles.buttonContent}
          labelStyle={styles.buttonLabel}>
          {price ? t('paywall.unlockFor', { price }) : t('paywall.unlock')}
        </Button>

        {trialAvailable && <Text style={styles.fine}>{t('paywall.trialFine')}</Text>}

        <View style={styles.links}>
          {busy ? (
            <ActivityIndicator color={colors.textSecondary} />
          ) : (
            <Pressable onPress={restore} hitSlop={8}>
              <Text style={styles.link}>{t('paywall.restore')}</Text>
            </Pressable>
          )}
          <Text style={styles.linkDot}>·</Text>
          <Pressable onPress={() => setShowPrivacy(true)} hitSlop={8}>
            <Text style={styles.link}>{t('paywall.privacy')}</Text>
          </Pressable>
          <Text style={styles.linkDot}>·</Text>
          <Pressable onPress={() => Linking.openURL(TERMS_URL)} hitSlop={8}>
            <Text style={styles.link}>{t('paywall.terms')}</Text>
          </Pressable>
        </View>

        {__DEV__ && (
          <Pressable onPress={devSkip} style={styles.devSkip}>
            <Text style={styles.devSkipText}>{t('paywall.devSkip')}</Text>
          </Pressable>
        )}
      </View>

      <Modal
        visible={showPrivacy}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowPrivacy(false)}>
        <View style={styles.sheet}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>{t('nav.privacy')}</Text>
            <Pressable onPress={() => setShowPrivacy(false)} hitSlop={8}>
              <Text style={styles.sheetDone}>{t('common.done')}</Text>
            </Pressable>
          </View>
          <PrivacyScreen />
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.lg,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    ...type.title,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...type.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.xl,
  },
  features: {
    alignSelf: 'stretch',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  featureIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    ...type.body,
    flex: 1,
    lineHeight: 20,
  },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  error: {
    color: colors.danger,
    fontSize: 13,
    textAlign: 'center',
  },
  button: {
    borderRadius: radius.md,
  },
  secondary: {
    borderColor: colors.border,
  },
  buttonContent: {
    height: 52,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  fine: {
    ...type.caption,
    textAlign: 'center',
    lineHeight: 17,
  },
  links: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 28,
    marginTop: spacing.xs,
  },
  link: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  linkDot: {
    color: colors.textMuted,
  },
  devSkip: {
    alignSelf: 'center',
    padding: spacing.sm,
  },
  devSkipText: {
    color: colors.textMuted,
    fontSize: 12,
    textDecorationLine: 'underline',
  },
  sheet: {
    flex: 1,
    backgroundColor: colors.background,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
  },
  sheetTitle: {
    ...type.heading,
  },
  sheetDone: {
    color: colors.accentText,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default PaywallScreen;
