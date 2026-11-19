import { Language } from '../types';

export const LANGUAGES: Language[] = [
  { id: 'en', name: 'English', nativeName: 'English', code: 'EN', isPopular: true, supportTier: 'full' },
  { id: 'ta', name: 'Tamil', nativeName: 'தமிழ்', code: 'TA', isPopular: true, supportTier: 'full' },
  { id: 'tanglish', name: 'Tanglish', nativeName: 'Tanglish (Romanized Tamil)', code: 'TA-ROM', isPopular: true, supportTier: 'full' },
  { id: 'hi', name: 'Hindi', nativeName: 'हिन्दी', code: 'HI', isPopular: true, supportTier: 'full' },
  { id: 'te', name: 'Telugu', nativeName: 'తెలుగు', code: 'TE', isPopular: true, supportTier: 'full' },
  { id: 'ml', name: 'Malayalam', nativeName: 'മലയാളം', code: 'ML', supportTier: 'partial_prefix' },
  { id: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ', code: 'KN', supportTier: 'partial_prefix' },
  { id: 'bn', name: 'Bengali', nativeName: 'বাংলা', code: 'BN', supportTier: 'partial_prefix' },
  { id: 'mr', name: 'Marathi', nativeName: 'मराठी', code: 'MR', supportTier: 'partial_prefix' },
  { id: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી', code: 'GU', supportTier: 'partial_prefix' },
  { id: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', code: 'PA', supportTier: 'partial_prefix' },
  { id: 'ur', name: 'Urdu', nativeName: 'اردو', code: 'UR', supportTier: 'partial_prefix' },
  { id: 'es', name: 'Spanish', nativeName: 'Español', code: 'ES', isPopular: true, supportTier: 'full' },
  { id: 'fr', name: 'French', nativeName: 'Français', code: 'FR', supportTier: 'partial_prefix' },
  { id: 'de', name: 'German', nativeName: 'Deutsch', code: 'DE', supportTier: 'partial_prefix' },
  { id: 'it', name: 'Italian', nativeName: 'Italiano', code: 'IT', supportTier: 'partial_prefix' },
  { id: 'pt', name: 'Portuguese', nativeName: 'Português', code: 'PT', supportTier: 'partial_prefix' },
  { id: 'ja', name: 'Japanese', nativeName: '日本語', code: 'JA', supportTier: 'partial_prefix' },
  { id: 'ko', name: 'Korean', nativeName: '한국어', code: 'KO', supportTier: 'partial_prefix' },
  { id: 'zh', name: 'Chinese', nativeName: '中文 (Mandarin)', code: 'ZH', supportTier: 'partial_prefix' },
  { id: 'ar', name: 'Arabic', nativeName: 'العربية', code: 'AR', supportTier: 'partial_prefix' },
];

export const DEFAULT_LANGUAGE = LANGUAGES[0];
