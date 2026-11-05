import { LanguageOption } from '../types';

export interface ExtendedLanguageOption extends LanguageOption {
  isPrimary?: boolean;
  scriptDir?: 'rtl' | 'ltr';
  shortLabel?: string;
}

export const SUPPORTED_LANGUAGES: ExtendedLanguageOption[] = [
  // Primary Focus Languages
  {
    code: 'ur-PK',
    speechCode: 'ur-PK',
    name: 'Urdu (Pakistan)',
    nativeName: 'اردو (پاکستان)',
    flag: '🇵🇰',
    isPrimary: true,
    scriptDir: 'rtl',
    shortLabel: 'اردو',
  },
  {
    code: 'en-US',
    speechCode: 'en-US',
    name: 'English (US)',
    nativeName: 'English (United States)',
    flag: '🇺🇸',
    isPrimary: true,
    scriptDir: 'ltr',
    shortLabel: 'English',
  },

  // Additional Global Languages
  { code: 'en-GB', speechCode: 'en-GB', name: 'English (UK)', nativeName: 'English (UK)', flag: '🇬🇧', scriptDir: 'ltr' },
  { code: 'en-AU', speechCode: 'en-AU', name: 'English (Australia)', nativeName: 'English (AU)', flag: '🇦🇺', scriptDir: 'ltr' },
  { code: 'en-IN', speechCode: 'en-IN', name: 'English (India)', nativeName: 'English (IN)', flag: '🇮🇳', scriptDir: 'ltr' },
  { code: 'es-ES', speechCode: 'es-ES', name: 'Spanish (Spain)', nativeName: 'Español (España)', flag: '🇪🇸', scriptDir: 'ltr' },
  { code: 'es-MX', speechCode: 'es-MX', name: 'Spanish (Mexico)', nativeName: 'Español (México)', flag: '🇲🇽', scriptDir: 'ltr' },
  { code: 'ar-SA', speechCode: 'ar-SA', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦', scriptDir: 'rtl' },
  { code: 'fr-FR', speechCode: 'fr-FR', name: 'French (France)', nativeName: 'Français', flag: '🇫🇷', scriptDir: 'ltr' },
  { code: 'de-DE', speechCode: 'de-DE', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪', scriptDir: 'ltr' },
  { code: 'it-IT', speechCode: 'it-IT', name: 'Italian', nativeName: 'Italiano', flag: '🇮🇹', scriptDir: 'ltr' },
  { code: 'pt-BR', speechCode: 'pt-BR', name: 'Portuguese (Brazil)', nativeName: 'Português (Brasil)', flag: '🇧🇷', scriptDir: 'ltr' },
  { code: 'ja-JP', speechCode: 'ja-JP', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵', scriptDir: 'ltr' },
  { code: 'zh-CN', speechCode: 'zh-CN', name: 'Chinese (Mandarin)', nativeName: '简体中文', flag: '🇨🇳', scriptDir: 'ltr' },
  { code: 'ko-KR', speechCode: 'ko-KR', name: 'Korean', nativeName: '한국어', flag: '🇰🇷', scriptDir: 'ltr' },
  { code: 'hi-IN', speechCode: 'hi-IN', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳', scriptDir: 'ltr' },
  { code: 'tr-TR', speechCode: 'tr-TR', name: 'Turkish', nativeName: 'Türkçe', flag: '🇹🇷', scriptDir: 'ltr' },
  { code: 'ru-RU', speechCode: 'ru-RU', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺', scriptDir: 'ltr' },
  { code: 'nl-NL', speechCode: 'nl-NL', name: 'Dutch', nativeName: 'Nederlands', flag: '🇳🇱', scriptDir: 'ltr' },
  { code: 'id-ID', speechCode: 'id-ID', name: 'Indonesian', nativeName: 'Bahasa Indonesia', flag: '🇮🇩', scriptDir: 'ltr' },
  { code: 'fa-IR', speechCode: 'fa-IR', name: 'Persian (Farsi)', nativeName: 'فارسی', flag: '🇮🇷', scriptDir: 'rtl' },
  { code: 'sv-SE', speechCode: 'sv-SE', name: 'Swedish', nativeName: 'Svenska', flag: '🇸🇪', scriptDir: 'ltr' },
];

export const getLanguageByCode = (code: string): ExtendedLanguageOption => {
  return (
    SUPPORTED_LANGUAGES.find(
      (lang) =>
        lang.code.toLowerCase() === code.toLowerCase() ||
        lang.speechCode.toLowerCase() === code.toLowerCase()
    ) || SUPPORTED_LANGUAGES[0]
  );
};
