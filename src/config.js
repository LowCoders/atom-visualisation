/**
 * Application Global Configuration
 * Provides configurable defaults for language, typography, and visual preferences.
 * If not specified, English ('en') and 'medium' font size are the baseline defaults.
 */
export const APP_CONFIG = {
  defaultLanguage: 'en',
  defaultFontSize: 'medium', // 'small' | 'medium' | 'large'
  supportedLanguages: ['en', 'hu'],
  fallbackLanguage: 'en'
};
