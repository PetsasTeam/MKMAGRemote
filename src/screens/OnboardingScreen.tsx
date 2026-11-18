/**
 * First-run guide: three short pages on getting the box ready. Also opened
 * from Settings → Setup guide.
 */
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Button, Icon } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, spacing, type } from '../theme/tokens';
import { t } from '../i18n';

const PAGES = [
  { icon: 'remote-tv', title: t('onboard.title1'), body: t('onboard.body1') },
  { icon: 'cog-outline', title: t('onboard.title2'), body: t('onboard.body2') },
  { icon: 'wifi', title: t('onboard.title3'), body: t('onboard.body3') },
];

interface Props {
  onDone: () => void;
}

const OnboardingScreen: React.FC<Props> = ({ onDone }) => {
  const [page, setPage] = useState(0);
  const insets = useSafeAreaInsets();
  const last = page === PAGES.length - 1;
  const { icon, title, body } = PAGES[page];

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.lg },
      ]}>
      <View style={styles.topRow}>
        {!last && (
          <Pressable onPress={onDone} hitSlop={10}>
            <Text style={styles.skip}>{t('onboard.skip')}</Text>
          </Pressable>
        )}
      </View>

      <View style={styles.body}>
        <View style={styles.iconCircle}>
          <Icon source={icon} size={48} color={colors.accentText} />
        </View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.text}>{body}</Text>
      </View>

      <View style={styles.dots}>
        {PAGES.map((_, i) => (
          <View key={i} style={[styles.dot, i === page && styles.dotActive]} />
        ))}
      </View>

      <Button
        mode="contained"
        onPress={() => (last ? onDone() : setPage(page + 1))}
        style={styles.button}
        contentStyle={styles.buttonContent}
        labelStyle={styles.buttonLabel}>
        {last ? t('onboard.start') : t('onboard.next')}
      </Button>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.xl,
  },
  topRow: {
    height: 24,
    alignItems: 'flex-end',
  },
  skip: {
    color: colors.textSecondary,
    fontSize: 15,
  },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircle: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xxl,
  },
  title: {
    ...type.title,
    fontSize: 26,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  text: {
    ...type.body,
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 23,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.border,
  },
  dotActive: {
    width: 22,
    backgroundColor: colors.accent,
  },
  button: {
    borderRadius: radius.md,
  },
  buttonContent: {
    height: 54,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default OnboardingScreen;
