let language = 'hi-IN';
let rate = 0.9;

interface BrowserUtterance { lang: string; rate: number }
interface BrowserSpeech {
  cancel: () => void;
  speak: (utterance: BrowserUtterance) => void;
}
interface SpeechGlobals {
  speechSynthesis?: BrowserSpeech;
  SpeechSynthesisUtterance?: new (text: string) => BrowserUtterance;
}

const browser = globalThis as unknown as SpeechGlobals;

const speech = {
  stop() {
    browser.speechSynthesis?.cancel();
  },
  setDefaultLanguage(value: string) {
    language = value;
    return Promise.resolve(true);
  },
  setDefaultRate(value: number) {
    rate = value;
    return Promise.resolve(true);
  },
  speak(text: string) {
    if (!browser.speechSynthesis || !browser.SpeechSynthesisUtterance) return;
    const utterance = new browser.SpeechSynthesisUtterance(text);
    utterance.lang = language;
    utterance.rate = rate;
    browser.speechSynthesis.cancel();
    browser.speechSynthesis.speak(utterance);
  },
};

export default speech;
