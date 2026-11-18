/** The privacy policy, in the app (the same text is published for the App Store). */
import React from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { colors, spacing, type } from '../theme/tokens';
import { t } from '../i18n';

const PrivacyScreen: React.FC = () => (
  <ScrollView style={styles.container} contentContainerStyle={styles.content}>
    <Text style={styles.text}>{t('privacy.body')}</Text>
  </ScrollView>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.xl,
    paddingBottom: spacing.xxl * 2,
  },
  text: {
    ...type.body,
    color: colors.textSecondary,
    lineHeight: 23,
  },
});

export default PrivacyScreen;
