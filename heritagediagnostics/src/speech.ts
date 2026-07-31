import Tts from './tts';
import { Lang } from './translations';

// Voice guidance is a first-class feature here, not a gimmick: many users are
// low-literacy or elderly. Failures are swallowed — a device with no Hindi voice
// installed must still be able to use the app.
export async function speak(text: string, lang: Lang) {
  try {
    // TTS setup is asynchronous on Android. Calling speak immediately used to race
    // the engine/language initialisation and silently do nothing on slower phones.
    await Tts.getInitStatus();
    await Tts.stop();
    await Tts.setDefaultLanguage(lang === 'hi' ? 'hi-IN' : 'en-IN');
    await Tts.setDefaultRate(0.45);
    Tts.speak(text);
  } catch (error) {
    // Android reports no_engine when the phone has no speech service installed.
    // Opening its standard installer is more useful than leaving the speaker dead.
    if ((error as { code?: string })?.code === 'no_engine') {
      try { await Tts.requestInstallEngine(); } catch { /* screen remains usable */ }
    }
  }
}

export const stopSpeaking = async () => {
  try {
    await Tts.stop();
  } catch {
    // Nothing was speaking.
  }
};
