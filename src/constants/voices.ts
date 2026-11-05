import { GeminiVoice, VoiceStylePreset } from '../types';

export const GEMINI_VOICES: GeminiVoice[] = [
  {
    id: 'Kore',
    name: 'Kore',
    gender: 'Female',
    character: 'Warm, Articulate, Respectful',
    description: 'Natural, warm, and highly articulate. Excellent for polite Pakistani Urdu (شائستہ لہجہ) and crisp American English.',
    recommendedStyles: [
      'Natural, respectful Pakistani Urdu speaker with warm cadence',
      'Clear, professional American English narrator',
      'Friendly customer guide with polite greeting',
    ],
  },
  {
    id: 'Fenrir',
    name: 'Fenrir',
    gender: 'Male',
    character: 'Deep, Resonant, Authoritative',
    description: 'Commanding baritone presence. Superb for Pakistani news broadcasts (خبرنامہ), formal speeches, documentaries, and dramatic readings.',
    recommendedStyles: [
      'Authoritative Pakistani broadcast journalist (اردو خبرنامہ)',
      'Deep, cinematic American English narrator',
      'Formal executive address',
    ],
  },
  {
    id: 'Puck',
    name: 'Puck',
    gender: 'Male',
    character: 'Enthusiastic, Youthful, Friendly',
    description: 'Bright and energetic. Ideal for casual Pakistani conversations (روزمرہ گفتگو), podcasts, storytelling, and youthful dialogue.',
    recommendedStyles: [
      'Casual, friendly Pakistani Urdu speaker (دوستانہ انداز)',
      'Upbeat, modern American podcast host',
      'Engaging story explainer',
    ],
  },
  {
    id: 'Charon',
    name: 'Charon',
    gender: 'Male',
    character: 'Calm, Poetic, Grounded',
    description: 'Gentle, measured, and reflective. Perfect for Urdu poetry (ادب و شاعری), thoughtful reflections, and meditation.',
    recommendedStyles: [
      'Poetic and classical Urdu recitation with graceful pauses (شائستہ و باوقار)',
      'Calm, soothing meditation instructor with slow breathing',
      'Comforting audiobook reader',
    ],
  },
  {
    id: 'Zephyr',
    name: 'Zephyr',
    gender: 'Female',
    character: 'Modern, Crisp, Conversational',
    description: 'Contemporary and clear. Well-suited for virtual assistants, digital apps, tutorials, and bilingual tech demos.',
    recommendedStyles: [
      'Modern, polite bilingual digital assistant (اردو اور انگریزی)',
      'Crisp, upbeat tech explainer',
      'Interactive customer service agent',
    ],
  },
];

export const STYLE_PRESETS: VoiceStylePreset[] = [
  {
    id: 'natural',
    name: 'Natural & Expressive',
    prompt: 'Clear, natural, and expressive speaker with authentic emotional cadence and balanced pacing',
    iconName: 'Sparkles',
  },
  {
    id: 'urdu_polite',
    name: 'Urdu Adab & Politeness (شائستہ و باادب)',
    prompt: 'Speak in polite, respectful Pakistani Urdu with classic adab, warm cadence, and standard pronunciation',
    iconName: 'Heart',
  },
  {
    id: 'news',
    name: 'Broadcast News Anchor',
    prompt: 'Professional, articulate broadcast news anchor with confident cadence and crisp delivery',
    iconName: 'Radio',
  },
  {
    id: 'storyteller',
    name: 'Vivid Storyteller',
    prompt: 'Expressive and animated storyteller with rich vocal inflection, dramatic pacing, and warm character',
    iconName: 'BookOpen',
  },
  {
    id: 'urdu_poetry',
    name: 'Urdu Poetry & Nazm (ادب و شاعری)',
    prompt: 'Graceful, slow-paced recitation in classical Urdu literary style with deep feeling and gentle pauses',
    iconName: 'Feather',
  },
  {
    id: 'tech_keynote',
    name: 'Tech Keynote & Modern',
    prompt: 'Upbeat, modern, clear presenter explaining tech innovations with enthusiasm and clarity',
    iconName: 'Cpu',
  },
  {
    id: 'calm_soothing',
    name: 'Calm & Soothing',
    prompt: 'Soft, slow, tranquil, and deeply calming voice with gentle breathing pauses',
    iconName: 'Wind',
  },
];

export const SAMPLE_SCRIPTS = [
  // Urdu (Pakistan) Samples
  {
    title: '🇵🇰 پاکستانی خوش آمدید و سلام (Urdu Greeting)',
    lang: 'ur-PK',
    text: 'السلام علیکم! ووکس کنورٹ میں خوش آمدید۔ یہ جدید صوتی ٹیکنالوجی آپ کے تحریری الفاظ کو قدرتی اور سلیس پاکستانی اردو آواز میں تبدیل کرتی ہے۔',
    suggestedVoice: 'Kore',
    suggestedStyle: 'urdu_polite',
  },
  {
    title: '🇵🇰 اردو قومی خبرنامہ (Urdu News Bulletin)',
    lang: 'ur-PK',
    text: 'اسلام آباد سے خبرنامہ: وزیرِ اعظم نے ملک بھر میں نئی ڈیجیٹل معیشت اور ٹیکنالوجی منصوبوں کے آغاز کا اعلان کیا ہے، جس سے لاکھوں نوجوانوں کو روزگار کے نئے مواقع ملیں گے۔',
    suggestedVoice: 'Fenrir',
    suggestedStyle: 'news',
  },
  {
    title: '🇵🇰 اقبال کی خوبصورت شاعری (Allama Iqbal Poetry)',
    lang: 'ur-PK',
    text: 'ستاروں سے آگے جہاں اور بھی ہیں، ابھی عشق کے امتحاں اور بھی ہیں۔ تہی زندگی سے نہیں یہ فضائیں، یہاں سینکڑوں کارواں اور بھی ہیں۔',
    suggestedVoice: 'Charon',
    suggestedStyle: 'urdu_poetry',
  },
  {
    title: '🇵🇰 روزمرہ دوستانہ گفتگو (Casual Urdu Chat)',
    lang: 'ur-PK',
    text: 'کیسے ہیں آپ سب؟ امید ہے سب خیریت سے ہوں گے۔ آج کا موسم لاہور میں کافی خوشگوار ہے، چلیے مل کر چائے پیتے ہیں اور کچھ نیا سیکھتے ہیں۔',
    suggestedVoice: 'Puck',
    suggestedStyle: 'natural',
  },

  // English (US) Samples
  {
    title: '🇺🇸 US Tech Product Launch',
    lang: 'en-US',
    text: 'Welcome to VoxConvert Studio. Today, we are unveiling state-of-the-art neural speech synthesis and ultra-accurate speech-to-text. Experience natural voices, zero latency, and seamless API integration for your next project.',
    suggestedVoice: 'Zephyr',
    suggestedStyle: 'tech_keynote',
  },
  {
    title: '🇺🇸 US National News Brief',
    lang: 'en-US',
    text: 'Good evening. Federal transportation officials announced a landmark nationwide infrastructure initiative today, modernizing high-speed passenger rail and clean energy transit networks across 12 states.',
    suggestedVoice: 'Fenrir',
    suggestedStyle: 'news',
  },
  {
    title: '🇺🇸 Conversational AI Assistant',
    lang: 'en-US',
    text: 'Hey there! How can I help you today? I can convert your speech into clean text, generate studio-quality voiceovers, or help you communicate seamlessly across languages.',
    suggestedVoice: 'Kore',
    suggestedStyle: 'natural',
  },
];
