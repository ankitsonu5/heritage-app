import Tts from './tts';
import { Lang } from './translations';

// Voice guidance is a first-class feature here, not a gimmick: many users are
// low-literacy or elderly. Failures are swallowed — a device with no Hindi voice
// installed must still be able to use the app.
export function speak(text: string, lang: Lang) {
  try {
    Tts.stop();
    Tts.setDefaultLanguage(lang === 'hi' ? 'hi-IN' : 'en-IN');
    Tts.setDefaultRate(0.45);
    Tts.speak(text);
  } catch {
    // No voice available; the screen still reads fine.
  }
}

export const stopSpeaking = () => {
  try {
    Tts.stop();
  } catch {
    // Nothing was speaking.
  }
};
