// SweetAlert for the dashboard — the same modal language the mobile app uses, so
// an error looks the same to a PRO on a phone and to an admin on a desktop.
// Hand-rolled rather than pulling in sweetalert2, to keep the bundle self-contained
// and the styling consistent with the brand.

import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { useLang } from './i18n';

export type AlertType = 'success' | 'error' | 'warning' | 'info';

type AlertState = {
  visible: boolean;
  type: AlertType;
  title: string;
  message: string;
  onConfirm?: () => void;
  confirmText?: string;
  cancelText?: string;
};

const CLOSED: AlertState = { visible: false, type: 'info', title: '', message: '' };

const FACE: Record<AlertType, { icon: string; color: string; ring: string }> = {
  success: { icon: '✓', color: '#1F8A5B', ring: '#E8F5EE' },
  error: { icon: '✕', color: '#A00000', ring: '#F8E8E8' },
  warning: { icon: '!', color: '#B7863A', ring: '#F7EDD9' },
  info: { icon: 'i', color: '#5B4A9E', ring: '#EDE9F8' },
};

type AlertApi = {
  alert: (type: AlertType, message: string, title?: string) => void;
  confirm: (message: string, onConfirm: () => void, title?: string) => void;
};

const AlertContext = createContext<AlertApi | null>(null);

const DEFAULT_TITLE: Record<'en' | 'hi', Record<AlertType, string>> = {
  en: { success: 'Done', error: 'Something went wrong', warning: 'Please note', info: 'Information' },
  hi: { success: 'हो गया', error: 'कुछ गलत हुआ', warning: 'ध्यान दें', info: 'जानकारी' },
};

export function AlertProvider({ children }: { children: React.ReactNode }) {
  const { lang } = useLang();
  const [state, setState] = useState<AlertState>(CLOSED);

  const close = useCallback(() => setState(s => ({ ...s, visible: false })), []);

  const api = useMemo<AlertApi>(() => ({
    alert: (type, message, title) =>
      setState({ visible: true, type, message, title: title || DEFAULT_TITLE[lang][type] }),
    confirm: (message, onConfirm, title) =>
      setState({
        visible: true, type: 'warning', message,
        title: title || (lang === 'en' ? 'Are you sure?' : 'पक्का?'),
        onConfirm,
        confirmText: lang === 'en' ? 'Yes' : 'हाँ',
        cancelText: lang === 'en' ? 'No' : 'नहीं',
      }),
  }), [lang]);

  const face = FACE[state.type];

  return (
    <AlertContext.Provider value={api}>
      {children}

      {state.visible && (
        <div className="swal-backdrop" onClick={close} role="presentation">
          <div
            className="swal"
            role="alertdialog"
            aria-modal="true"
            aria-label={state.title}
            onClick={e => e.stopPropagation()}>
            <span className="swal-icon" style={{ color: face.color, background: face.ring, borderColor: face.color }}>
              {face.icon}
            </span>
            <h2>{state.title}</h2>
            <p>{state.message}</p>

            <div className="swal-actions">
              {state.onConfirm && (
                <button className="ghost" onClick={close}>{state.cancelText}</button>
              )}
              <button
                className="primary"
                autoFocus
                onClick={() => {
                  const run = state.onConfirm;
                  close();
                  run?.();
                }}>
                {state.confirmText || (lang === 'en' ? 'OK' : 'ठीक है')}
              </button>
            </div>
          </div>
        </div>
      )}
    </AlertContext.Provider>
  );
}

export function useAlert() {
  const api = useContext(AlertContext);
  if (!api) throw new Error('useAlert must be used inside <AlertProvider>');
  return api;
}
