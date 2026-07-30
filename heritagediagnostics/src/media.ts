// Camera + file picking, native implementation.
// The web build swaps in media.web.ts, so screens never import a native-only
// module directly and the same screen code runs in a browser.

import { PermissionsAndroid, Platform } from 'react-native';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import { pick, types, errorCodes, isErrorWithCode } from '@react-native-documents/picker';

// `file` is only ever set by the web variant; native uploads use {uri,type,name}.
export type PickedFile = { uri: string; type?: string; name?: string; file?: File };

export class PermissionDenied extends Error {}

export async function capturePhoto(): Promise<PickedFile | null> {
  // Permission belongs with the camera call, not in the screen — the web variant
  // has no equivalent and the screen should not have to know that.
  if (Platform.OS === 'android') {
    const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA);
    if (granted !== PermissionsAndroid.RESULTS.GRANTED) throw new PermissionDenied('camera_denied');
  }

  const result = await launchCamera({
    mediaType: 'photo', quality: 0.8, cameraType: 'back', saveToPhotos: false,
  });
  if (result.errorMessage) throw new Error(result.errorMessage);
  const asset = result.assets?.[0];
  if (!asset?.uri) return null;
  return { uri: asset.uri, type: asset.type, name: asset.fileName };
}

// The prescription may already be a photo in the gallery — a relative often sends
// it over WhatsApp rather than the patient photographing it themselves.
export async function pickFromGallery(): Promise<PickedFile | null> {
  const result = await launchImageLibrary({ mediaType: 'photo', quality: 0.8, selectionLimit: 1 });
  if (result.errorMessage) throw new Error(result.errorMessage);
  const asset = result.assets?.[0];
  if (!asset?.uri) return null;
  return { uri: asset.uri, type: asset.type, name: asset.fileName };
}

// A prescription often runs to more than one page. selectionLimit:0 lets the
// gallery return as many as the patient ticks; we cap the total in the screen.
export async function pickManyFromGallery(limit = 6): Promise<PickedFile[]> {
  const result = await launchImageLibrary({ mediaType: 'photo', quality: 0.8, selectionLimit: limit });
  if (result.errorMessage) throw new Error(result.errorMessage);
  return (result.assets ?? [])
    .filter(a => a.uri)
    .map(a => ({ uri: a.uri as string, type: a.type, name: a.fileName }));
}

export async function pickPdf(): Promise<PickedFile | null> {
  try {
    // pick() returns a non-empty array; we only ever want one report.
    const [picked] = await pick({ type: [types.pdf] });
    return { uri: picked.uri, type: picked.type || 'application/pdf', name: picked.name || 'report.pdf' };
  } catch (error) {
    // Tapping "cancel" in the file browser is not an error worth surfacing.
    if (isErrorWithCode(error) && error.code === errorCodes.OPERATION_CANCELED) return null;
    throw error;
  }
}
