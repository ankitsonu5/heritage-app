// Web implementation of camera + file picking.
//
// `capture="environment"` opens the rear camera on a phone browser and falls back
// to a normal file chooser on desktop, so the same screen works in both.
// The picked File is handed to FormData as-is (see api/hooks.ts), which is what
// the browser's multipart encoder expects.

export type PickedFile = { uri: string; type?: string; name?: string; file?: File };

// The browser handles its own camera permission prompt, so this never throws here.
// Declared to keep the module's shape identical to media.ts.
export class PermissionDenied extends Error {}

function chooseFile(accept: string, capture?: string): Promise<PickedFile | null> {
  return new Promise(resolve => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    if (capture) input.setAttribute('capture', capture);
    input.style.display = 'none';

    input.onchange = () => {
      const file = input.files?.[0];
      input.remove();
      if (!file) return resolve(null);
      resolve({
        uri: URL.createObjectURL(file),
        type: file.type,
        name: file.name,
        file,
      });
    };

    // A cancelled picker fires no event in some browsers; resolving null on
    // focus-return keeps the screen from hanging on a spinner.
    window.addEventListener('focus', () => {
      setTimeout(() => {
        if (document.body.contains(input)) {
          input.remove();
          resolve(null);
        }
      }, 400);
    }, { once: true });

    document.body.appendChild(input);
    input.click();
  });
}

export const capturePhoto = () => chooseFile('image/*', 'environment');
// No `capture` attribute — the browser opens the file chooser rather than the camera.
export const pickFromGallery = () => chooseFile('image/*');
export const pickPdf = () => chooseFile('application/pdf');

// Web mirror of the native multi-picker: one file chooser, `multiple` set.
export function pickManyFromGallery(limit = 6): Promise<PickedFile[]> {
  return new Promise(resolve => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true;
    input.style.display = 'none';

    input.onchange = () => {
      const files = Array.from(input.files ?? []).slice(0, limit);
      input.remove();
      resolve(files.map(file => ({
        uri: URL.createObjectURL(file), type: file.type, name: file.name, file,
      })));
    };

    window.addEventListener('focus', () => {
      setTimeout(() => {
        if (document.body.contains(input)) { input.remove(); resolve([]); }
      }, 400);
    }, { once: true });

    document.body.appendChild(input);
    input.click();
  });
}
