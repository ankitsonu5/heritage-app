import { PermissionsAndroid, Platform } from 'react-native';
import ReactNativeBlobUtil from 'react-native-blob-util';

const PDF_MIME = 'application/pdf';

export function reportFileName(orderId: string) {
  const safeOrderId = orderId.replace(/[^a-z0-9_-]+/gi, '-');
  return `Heritage-${safeOrderId || 'Report'}.pdf`;
}

async function requestLegacyDownloadPermission() {
  if (Platform.OS !== 'android' || Number(Platform.Version) > 28) return;
  const result = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
  );
  if (result !== PermissionsAndroid.RESULTS.GRANTED) {
    throw new Error('download_permission_denied');
  }
}

// Downloads the actual PDF instead of merely opening its remote URL. Android uses
// the system Download Manager so the file appears in Downloads with a completion
// notification. iOS keeps it in the app's Documents folder (visible in Files) and
// opens the native document preview once the transfer finishes.
export async function downloadPdf(url: string, fileName: string, description: string) {
  if (Platform.OS === 'android') {
    await requestLegacyDownloadPermission();
    const legacyPath = `${ReactNativeBlobUtil.fs.dirs.LegacyDownloadDir}/${fileName}`;
    const response = await ReactNativeBlobUtil.config({
      addAndroidDownloads: {
        useDownloadManager: true,
        notification: true,
        title: fileName,
        description,
        mime: PDF_MIME,
        mediaScannable: true,
        storeInDownloads: true,
        path: legacyPath,
      },
    }).fetch('GET', url);

    const status = response.info().status;
    if (status && (status < 200 || status >= 300)) throw new Error(`download_http_${status}`);
    return response.path();
  }

  const path = `${ReactNativeBlobUtil.fs.dirs.DocumentDir}/${fileName}`;
  if (await ReactNativeBlobUtil.fs.exists(path)) await ReactNativeBlobUtil.fs.unlink(path);
  const response = await ReactNativeBlobUtil.config({ path, fileCache: true }).fetch('GET', url);
  const status = response.info().status;
  if (status < 200 || status >= 300) throw new Error(`download_http_${status}`);
  await ReactNativeBlobUtil.ios.openDocument(response.path());
  return response.path();
}
