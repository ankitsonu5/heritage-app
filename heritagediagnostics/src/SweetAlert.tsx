import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Portal } from './components/Portal';
import { C, T } from './theme';

export type SweetAlertType = 'success' | 'error' | 'warning' | 'info';
export interface SweetAlertState {
  visible: boolean;
  type: SweetAlertType;
  title: string;
  message: string;
  // Set for a question rather than a statement: the dialog grows a Cancel button
  // and only calls this on the confirming tap. Used to gate the steps that cannot
  // be undone — "sample taken", "cash taken", "send to lab".
  onAccept?: () => void;
  acceptText?: string;
}

// Every user-facing message in the app goes through this — there is no native
// Alert.alert anywhere, so a success on the patient's phone and an error on the
// lab tablet look like the same product. The admin dashboard mirrors it in HTML.

const FACE: Record<SweetAlertType, { color: string; ring: string; mark: string }> = {
  success: { color: '#1F8A5B', ring: '#E8F5EE', mark: '✓' },
  error: { color: '#A23A3E', ring: '#F8E8E8', mark: '×' },
  warning: { color: '#B7863A', ring: '#F7EDD9', mark: '!' },
  info: { color: '#5B4A9E', ring: '#EDE9F8', mark: 'i' },
};

export function SweetAlert({ state, confirmText, cancelText, onConfirm }: {
  state: SweetAlertState;
  confirmText: string;
  cancelText?: string;
  onConfirm: () => void;
}) {
  const face = FACE[state.type];
  const asking = Boolean(state.onAccept);

  return (
    <Portal id="sweet-alert" visible={state.visible}>
      <View style={styles.backdrop}>
        <View style={styles.dialog}>
          <View style={[styles.mark, { borderColor: face.color, backgroundColor: face.ring }]}>
            <Text style={[styles.markText, { color: face.color }]}>{face.mark}</Text>
          </View>
          <Text style={styles.title}>{state.title}</Text>

          {/* The message scrolls; the buttons below never do. A long confirmation on a
              small phone — or on any phone whose owner has set a large system font,
              which is most of this app's users — used to push the buttons off the
              bottom of the screen with no way to reach them. */}
          <ScrollView
            style={styles.messageScroll}
            contentContainerStyle={styles.messageContent}
            showsVerticalScrollIndicator={false}
            bounces={false}>
            <Text style={styles.message}>{state.message}</Text>
          </ScrollView>

          {asking ? (
            <View style={{ flexDirection: 'row', gap: 10, alignSelf: 'stretch' }}>
              {/* Cancel first and visually quieter: the safe way out should be the
                  easy one, and "yes" should take a deliberate tap. */}
              <Pressable
                accessibilityRole="button"
                onPress={onConfirm}
                style={({ pressed }) => [styles.button, styles.half, styles.cancel, pressed && { opacity: .85 }]}>
                <Text style={[styles.buttonText, { color: C.text2 }]}>{cancelText ?? 'Cancel'}</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => { state.onAccept?.(); onConfirm(); }}
                style={({ pressed }) => [styles.button, styles.half, { backgroundColor: face.color }, pressed && { opacity: .85 }]}>
                <Text style={styles.buttonText}>{state.acceptText ?? confirmText}</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable
              accessibilityRole="button"
              onPress={onConfirm}
              style={({ pressed }) => [styles.button, { backgroundColor: face.color }, pressed && { opacity: .85 }]}>
              <Text style={styles.buttonText}>{confirmText}</Text>
            </Pressable>
          )}
        </View>
      </View>
    </Portal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(31,27,26,.55)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  dialog: {
    width: '100%', maxWidth: 350, backgroundColor: '#FFFFFF', borderRadius: 20,
    // Never taller than the screen. Without the cap the dialog grows to fit its text
    // and takes the buttons with it, off the bottom.
    maxHeight: '85%',
    paddingHorizontal: 24, paddingTop: 26, paddingBottom: 20, alignItems: 'center', elevation: 12,
    shadowColor: '#2A1C14', shadowOpacity: .25, shadowRadius: 30, shadowOffset: { width: 0, height: 14 },
  },
  // flexShrink is what makes the cap work: the scroller is the one part that gives up
  // space, so the mark, title, and buttons keep theirs.
  messageScroll: { alignSelf: 'stretch', flexShrink: 1, marginTop: 6, marginBottom: 20 },
  messageContent: { flexGrow: 1, justifyContent: 'center' },
  mark: { width: 62, height: 62, borderRadius: 31, borderWidth: 2.5, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  markText: { ...T.title, fontSize: 30, lineHeight: 36 },
  title: { ...T.title, fontSize: 19, color: C.text, textAlign: 'center' },
  message: { ...T.body, fontSize: 14.5, lineHeight: 22, color: C.text2, textAlign: 'center' },
  button: { minWidth: 140, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 13 },
  half: { flex: 1, minWidth: 0 },
  cancel: { backgroundColor: '#F0EAE0' },
  buttonText: { ...T.label, fontSize: 15.5, color: '#FFFFFF', textAlign: 'center' },
});
