import { useNavigation } from '@react-navigation/native';
import React, { useState } from 'react';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';

import { useSubmitPrescription } from '../../api/hooks';
import { capturePhoto, PermissionDenied, PickedFile, pickManyFromGallery } from '../../media';
import Icon from '../../components/Icon';
import { Portal } from '../../components/Portal';
import { errorMessage } from '../../client';
import { useSession } from '../../store/session';
import { SweetAlert, SweetAlertState } from '../../SweetAlert';
import { Button, C, styles } from '../../theme';
import { tr } from '../../translations';
import { speak } from '../../speech';

// A prescription rarely runs past a few pages, and the server caps uploads at six.
const MAX_PHOTOS = 6;

export default function CameraScreen() {
  const { lang, voiceGuidance } = useSession();
  const navigation = useNavigation<any>();
  const submit = useSubmitPrescription();

  // A prescription can be several pages, so this is a list, not one photo.
  const [photos, setPhotos] = useState<PickedFile[]>([]);
  const [sheet, setSheet] = useState(false);
  const [alert, setAlert] = useState<SweetAlertState>({ visible: false, type: 'info', title: '', message: '' });

  const show = (type: SweetAlertState['type'], message: string) =>
    setAlert({ visible: true, type, title: tr(type === 'error' ? 'error' : 'success', lang), message });

  // Camera or gallery. The prescription is often already a photo someone sent over
  // WhatsApp, so forcing the patient to re-photograph a screen would be absurd.
  // The camera adds one page at a time; the gallery can hand back several at once.
  const pick = async (from: 'camera' | 'gallery') => {
    setSheet(false);
    try {
      const room = MAX_PHOTOS - photos.length;
      if (room <= 0) return show('warning', tr('maxPhotos', lang, String(MAX_PHOTOS)));

      const picked = from === 'camera'
        ? [await capturePhoto()].filter(Boolean) as PickedFile[]
        : await pickManyFromGallery(room);

      if (picked.length) setPhotos(prev => [...prev, ...picked].slice(0, MAX_PHOTOS));
    } catch (error) {
      const permissionMessage = error instanceof PermissionDenied
        ? tr(error.permission === 'gallery' ? 'galleryPermission' : 'cameraPermission', lang)
        : null;
      show(
        error instanceof PermissionDenied ? 'warning' : 'error',
        permissionMessage ?? errorMessage(error),
      );
    }
  };

  const removeAt = (index: number) => setPhotos(prev => prev.filter((_, i) => i !== index));

  const send = async () => {
    if (!photos.length) return show('warning', tr('cameraHelp', lang));
    try {
      await submit.mutateAsync(photos);
      if (voiceGuidance) speak(tr('sent', lang), lang);
      navigation.replace('Sent');
    } catch (error) {
      show('error', errorMessage(error));
    }
  };

  return (
    <>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
        <Text style={styles.title}>{tr('sendRx', lang)}</Text>
        <Text style={styles.subtitle}>{tr('cameraHelp', lang)}</Text>

        {photos.length === 0 ? (
          <View style={{
            height: 330, borderRadius: 18, borderWidth: 2, borderStyle: 'dashed', borderColor: C.gold,
            backgroundColor: '#2B2525', alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden', marginBottom: 12,
          }}>
            <Icon name="report" size={54} color={C.gold} />
            <Text style={{ color: C.white, marginTop: 10, paddingHorizontal: 20, textAlign: 'center' }}>
              {tr('cameraHelp', lang)}
            </Text>
          </View>
        ) : (
          <>
            {/* First page big, the rest as thumbnails. Each has an × to drop it. */}
            <View style={{
              height: 300, borderRadius: 18, borderWidth: 2, borderColor: C.gold,
              backgroundColor: '#2B2525', overflow: 'hidden', marginBottom: 10,
            }}>
              <Image source={{ uri: photos[0].uri }} resizeMode="contain" style={{ width: '100%', height: '100%' }} />
            </View>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
              {photos.map((p, i) => (
                <View key={`${p.uri}-${i}`} style={{ width: 76, height: 76 }}>
                  <Image source={{ uri: p.uri }} style={{ width: 76, height: 76, borderRadius: 10, backgroundColor: '#2B2525' }} />
                  <Pressable
                    onPress={() => removeAt(i)}
                    hitSlop={8}
                    accessibilityLabel={tr('remove', lang)}
                    style={{
                      position: 'absolute', top: -6, right: -6,
                      width: 24, height: 24, borderRadius: 12, backgroundColor: C.red,
                      alignItems: 'center', justifyContent: 'center',
                    }}>
                    <Icon name="close" size={13} color={C.white} />
                  </Pressable>
                </View>
              ))}
            </View>

            <Text style={[styles.muted, { marginBottom: 8 }]}>
              {tr('pagesSelected', lang, String(photos.length), String(MAX_PHOTOS))}
            </Text>
          </>
        )}

        <Button
          icon="camera"
          title={photos.length ? tr('addMorePhotos', lang) : tr('sendRx', lang)}
          onPress={() => setSheet(true)}
          disabled={submit.isPending || photos.length >= MAX_PHOTOS}
        />
        {photos.length > 0 && <Button title={tr('send', lang)} onPress={send} busy={submit.isPending} />}
        {voiceGuidance && (
          <Button secondary icon="speaker" title={tr('listen', lang)} onPress={() => speak(tr('cameraHelp', lang), lang)} />
        )}
      </ScrollView>

      {/* Camera or gallery — a bottom sheet, so the choice is one tap either way. */}
      <Portal id="photo-source" visible={sheet}>
        <Pressable
          onPress={() => setSheet(false)}
          style={{ flex: 1, backgroundColor: 'rgba(31,27,26,.5)', justifyContent: 'flex-end' }}>
          <Pressable
            onPress={event => event.stopPropagation()}
            style={{
              backgroundColor: C.bg, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 18,
            }}>
            <Text style={styles.title}>{tr('choosePhotoSource', lang)}</Text>

            {([
              { key: 'camera', icon: 'camera', label: tr('takePhoto', lang), hint: tr('takePhotoHint', lang) },
              { key: 'gallery', icon: 'report', label: tr('fromGallery', lang), hint: tr('fromGalleryHint', lang) },
            ] as const).map(option => (
              <Pressable
                key={option.key}
                onPress={() => pick(option.key)}
                style={({ pressed }) => [{
                  flexDirection: 'row', alignItems: 'center', gap: 13,
                  padding: 16, marginBottom: 10, borderRadius: 14,
                  backgroundColor: C.white, borderWidth: 1.5, borderColor: C.borderSoft,
                }, pressed && { opacity: 0.7 }]}>
                <View style={{
                  width: 46, height: 46, borderRadius: 13, backgroundColor: '#F8E8E8',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon name={option.icon} size={24} color={C.red} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>{option.label}</Text>
                  <Text style={styles.muted}>{option.hint}</Text>
                </View>
                <Icon name="chevron" size={18} color={C.gray} />
              </Pressable>
            ))}

            <Button secondary title={tr('cancel', lang)} onPress={() => setSheet(false)} />
          </Pressable>
        </Pressable>
      </Portal>

      <SweetAlert
        state={alert}
        confirmText={tr('ok', lang)}
        onConfirm={() => setAlert(previous => ({ ...previous, visible: false }))}
      />
    </>
  );
}
