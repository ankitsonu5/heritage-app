import React from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, TextInput, TextInputProps, TextStyle, View } from 'react-native';
import { Lang, tr } from './translations';
import { chipStyle } from './constants/status';
import Icon, { IconName } from './components/Icon';

export const C = {
  bg: '#F6EFE6', paper: '#FFFDFA', white: '#FFFFFF',
  text: '#1F1B1A', text2: '#4A4340', gray: '#7A716C',
  maroon: '#5E111B', wine: '#6B1420', red: '#A23A3E', gold: '#B7863A', green: '#1F8A5B',
  border: '#E7DCCC', borderSoft: '#F0E7DA',
};

// Mukta is the app's face: a Devanagari-first family that also carries Latin, so
// Hindi and English sit on the same skeleton instead of looking like two fonts
// glued together. Inter is kept only for numerals — it has tabular figures, which
// is what makes columns of ₹ amounts and order codes line up.
type Weight = '400' | '500' | '600' | '700' | '800';

// Android does not reliably pick a weight out of a custom family — it wants the
// exact family name of the file that was bundled. So on Android each weight names
// its own face, and fontWeight is left off entirely; on web the family carries all
// the weights and fontWeight does the work.
const MUKTA_FILE: Record<Weight, string> = {
  '400': 'Mukta-Regular',
  '500': 'Mukta-Medium',
  '600': 'Mukta-SemiBold',
  '700': 'Mukta-Bold',
  '800': 'Mukta-ExtraBold',
};

const WEB_STACK = "'Mukta', 'Noto Sans Devanagari', system-ui, sans-serif";

function face(weight: Weight) {
  if (Platform.OS === 'web') {
    return { fontFamily: WEB_STACK, fontWeight: weight as TextStyle['fontWeight'] };
  }
  return { fontFamily: MUKTA_FILE[weight] };
}

export const FONT = Platform.OS === 'web' ? WEB_STACK : MUKTA_FILE['400'];

// Numerals only: Inter has tabular figures, so columns of ₹ amounts line up.
const NUM = Platform.select({
  web: "'Inter', 'Mukta', system-ui, sans-serif",
  ios: 'System',
  default: MUKTA_FILE['600'],
});

// The type scale. Every screen uses these — no ad-hoc fontSize anywhere.
//
// Devanagari matras sit above and below the baseline, so line-height runs at
// 1.4–1.6× rather than the ~1.2 that suits Latin — at anything tighter the lines
// collide. Letter-spacing stays at 0: extra tracking breaks the conjuncts.
//
// Nothing here disables allowFontScaling, so a phone set to a large system font
// still enlarges this text. That matters: the users are rural and often elderly.
export const T = {
  // Splash / logo headline.
  display: { ...face('800'), fontSize: 30, lineHeight: 42, letterSpacing: 0 },
  // Screen titles — "मेरी रिपोर्ट", "नई पर्चियाँ".
  h1: { ...face('700'), fontSize: 23, lineHeight: 34, letterSpacing: 0 },
  // Card headings and section titles.
  h2: { ...face('600'), fontSize: 18, lineHeight: 27, letterSpacing: 0 },
  // Main instructions.
  bodyLarge: { ...face('500'), fontSize: 16, lineHeight: 25, letterSpacing: 0 },
  // Ordinary text. 14px is the floor — below that it is unreadable for the elderly
  // and low-literacy users this app is actually for.
  body: { ...face('400'), fontSize: 14, lineHeight: 22, letterSpacing: 0 },
  // The English line that sits under the Hindi one.
  caption: { ...face('400'), fontSize: 12.5, lineHeight: 19, letterSpacing: 0 },
  // Every CTA. Big and bold — a button must not take a second read.
  button: { ...face('600'), fontSize: 17, lineHeight: 24, letterSpacing: 0 },
  num: { fontFamily: NUM, fontWeight: '600' as TextStyle['fontWeight'] },

  // Aliases onto the same scale, so older screens keep working.
  get hero() { return this.display; },
  get title() { return this.h1; },
  get label() { return this.h2; },
  get small() { return this.caption; },
};

export function Button({ title, onPress, disabled = false, secondary = false, compact = false, busy = false, icon }: {
  title?: string;
  onPress: () => void;
  disabled?: boolean;
  secondary?: boolean;
  compact?: boolean;
  busy?: boolean;
  icon?: IconName;
}) {
  const tint = secondary ? C.maroon : C.white;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      disabled={disabled || busy}
      onPress={onPress}
      style={({ pressed }) => [styles.button, secondary && styles.secondaryButton, compact && styles.compactButton, (disabled || busy) && styles.disabled, pressed && styles.pressed]}>
      {busy ? (
        <ActivityIndicator color={secondary ? C.red : C.white} />
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {icon ? <Icon name={icon} size={compact ? 17 : 19} color={tint} /> : null}
          {title ? (
            <Text style={[styles.buttonText, secondary && styles.secondaryButtonText]}>{title}</Text>
          ) : null}
        </View>
      )}
    </Pressable>
  );
}

export function Card({ children, onPress, accent }: { children: React.ReactNode; onPress?: () => void; accent?: string }) {
  return <Pressable disabled={!onPress} onPress={onPress} style={({ pressed }) => [styles.card, accent ? { borderLeftWidth: 5, borderLeftColor: accent } : null, pressed && styles.pressed]}>{children}</Pressable>;
}

export function Field(props: TextInputProps) { return <TextInput placeholderTextColor="#8C8580" {...props} style={[styles.input, props.style]} />; }

// Password input with a show/hide toggle. Typing a password blind on a phone
// keypad is where most failed logins actually come from.
export function PasswordField({ show, onToggleShow, ...props }: TextInputProps & {
  show: boolean;
  onToggleShow: () => void;
}) {
  return (
    <View style={{ justifyContent: 'center' }}>
      <TextInput
        placeholderTextColor="#8C8580"
        secureTextEntry={!show}
        autoCapitalize="none"
        autoCorrect={false}
        {...props}
        style={[styles.input, { paddingRight: 52 }, props.style]}
      />
      <Pressable
        onPress={onToggleShow}
        accessibilityRole="button"
        accessibilityLabel={show ? 'पासवर्ड छुपाएँ' : 'पासवर्ड दिखाएँ'}
        hitSlop={10}
        style={{ position: 'absolute', right: 6, width: 42, height: 42, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={show ? 'eye-off' : 'eye'} size={20} color={C.gray} />
      </Pressable>
    </View>
  );
}

// Colours come from constants/status.ts, so a newly added status can never
// silently render as "some default red" because a ternary here was missed.
export function Chip({ status, label }: { status?: string; label: string }) {
  return <Text style={[styles.chip, chipStyle(status)]}>{label}</Text>;
}

export function Header({ title, lang, setLang, onBack, voiceOn, onToggleVoice, actions }: {
  title: string;
  lang: Lang;
  setLang: (lang: Lang) => void;
  onBack?: () => void;
  // One button, both states. It used to be hidden whenever voice was off, which
  // left no way to switch it back on.
  voiceOn?: boolean;
  onToggleVoice?: () => void;
  // Slot for the notification bell, so every role's header carries it.
  actions?: React.ReactNode;
}) {
  return (
    <View style={styles.header}>
      {/* Brand on the left, taking all the room it can — the title no longer fights
          a centred layout for width, so "Heritage Diagnostics" fits instead of
          truncating to "Heritage Diagnosti…". */}
      <View style={styles.brand}>
        {/* No monogram badge — just the name, as requested. */}
        <View style={{ flexShrink: 1 }}>
          <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85} style={styles.headerTitle}>{title}</Text>
          <Text numberOfLines={1} style={styles.headerSub}>Varanasi</Text>
        </View>
      </View>
      <View style={styles.headerActions}>
        {actions}
        {onToggleVoice ? (
          <Pressable
            onPress={onToggleVoice}
            accessibilityRole="switch"
            accessibilityState={{ checked: Boolean(voiceOn) }}
            accessibilityLabel={tr(voiceOn ? 'voiceOn' : 'voiceOff', lang)}
            style={[styles.roundAction, !voiceOn && { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#ffffff55' }]}>
            <Icon name={voiceOn ? 'speaker' : 'speaker-off'} size={17} color={voiceOn ? C.white : '#ffffff99'} />
          </Pressable>
        ) : null}
        <Pressable onPress={() => setLang(lang === 'hi' ? 'en' : 'hi')} style={styles.lang}><Text style={styles.langText}>{lang === 'hi' ? 'EN' : 'हिं'}</Text></Pressable>
        {onBack ? (
          <Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel={tr('back', lang)} style={styles.roundAction}>
            <Icon name="logout" size={18} color={C.white} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg }, content: { padding: 18, paddingBottom: 38 },
  title: { ...T.h1, color: C.maroon, marginBottom: 6 },
  subtitle: { ...T.bodyLarge, color: C.text2, marginBottom: 16 },
  sectionTitle: { ...T.h2, color: C.maroon, marginTop: 14, marginBottom: 10 },
  card: { backgroundColor: C.white, borderWidth: 1, borderColor: C.borderSoft, borderRadius: 16, padding: 16, marginBottom: 12, elevation: 1, shadowColor: '#2A1C14', shadowOpacity: .06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
  button: { minHeight: 52, backgroundColor: C.red, borderRadius: 13, paddingHorizontal: 16, paddingVertical: 14, alignItems: 'center', justifyContent: 'center', marginVertical: 6 },
  compactButton: { minHeight: 40, paddingVertical: 8, paddingHorizontal: 12 },
  secondaryButton: { backgroundColor: C.white, borderWidth: 1.5, borderColor: C.border },
  disabled: { opacity: .45 }, pressed: { opacity: .82 },
  buttonText: { ...T.button, color: C.white, textAlign: 'center' },
  secondaryButtonText: { color: C.maroon },
  input: { ...T.bodyLarge, backgroundColor: C.white, borderWidth: 1.5, borderColor: C.border, borderRadius: 11, paddingHorizontal: 14, paddingVertical: 13, color: C.text, marginVertical: 6 },
  label: { ...T.h2, color: C.maroon },
  muted: { ...T.caption, color: C.gray, marginTop: 3 },
  // The English line that sits under a Hindi one: same block, quieter voice.
  sub: { ...T.caption, color: C.gray, marginTop: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 11 }, between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  chip: { ...T.small, alignSelf: 'flex-start', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5, fontWeight: '600', overflow: 'hidden' },
  header: { minHeight: 62, backgroundColor: C.maroon, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, elevation: 4 },
  headerActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 6, flexShrink: 0 },
  brand: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 9 }, logoCircle: { width: 34, height: 34, borderRadius: 17, backgroundColor: C.paper, alignItems: 'center', justifyContent: 'center' },
  logoText: { ...T.num, color: C.red, fontSize: 12.5 },
  headerTitle: { ...T.label, color: C.white, fontSize: 15 },
  headerSub: { ...T.small, color: '#E6CFC7', fontSize: 10.5 },
  lang: { borderWidth: 1, borderColor: '#ffffff55', borderRadius: 16, minWidth: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  langText: { ...T.small, color: C.white, fontWeight: '700' },
  roundAction: { backgroundColor: '#ffffff26', width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  nav: { flexDirection: 'row', backgroundColor: C.white, borderTopWidth: 1, borderTopColor: C.borderSoft },
  navItem: { flex: 1, minHeight: 58, alignItems: 'center', justifyContent: 'center' },
  navText: { ...T.small, color: C.gray, fontWeight: '600' },
  navActive: { color: C.red },
});
