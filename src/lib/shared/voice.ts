// Languages for Speak (speech to text) and Listen (read aloud)
export const VOICE_LANGS = ["en-IN", "ml-IN", "hi-IN", "ta-IN"] as const;
export type VoiceLang = (typeof VOICE_LANGS)[number];
export const VOICE_LABEL: Record<VoiceLang, string> = { "en-IN": "English", "ml-IN": "മലയാളം (Malayalam)", "hi-IN": "हिन्दी (Hindi)", "ta-IN": "தமிழ் (Tamil)" };
