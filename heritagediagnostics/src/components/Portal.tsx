// A portal that stays INSIDE the app.
//
// React Native Web's <Modal> renders into a portal at document.body. The web build
// frames the app to a phone-sized column, so a Modal escaped that frame and opened
// full-width across the whole browser window — which is what the notification sheet
// and the alerts were doing.
//
// Overlays are rendered into a host mounted at the app's own root instead, so they
// are clipped to the app on the phone and in the browser alike.
//
// The manager below is deliberately NOT React state on the provider. An earlier
// version stored the nodes in provider state, and because `children` is a fresh
// object on every render, mounting re-rendered the provider, which re-rendered the
// Portal, which mounted again — an infinite loop that pegged the render cycle and
// left the bottom tabs unable to respond to a press at all. Here only the host
// subscribes and re-renders; the component that owns the Portal never does.

import React, { createContext, useContext, useEffect, useMemo, useReducer } from 'react';
import { StyleSheet, View } from 'react-native';

type Manager = {
  entries: Map<string, React.ReactNode>;
  listeners: Set<() => void>;
  set: (id: string, node: React.ReactNode) => void;
  remove: (id: string) => void;
  subscribe: (listener: () => void) => () => void;
};

function createManager(): Manager {
  const entries = new Map<string, React.ReactNode>();
  const listeners = new Set<() => void>();
  const emit = () => listeners.forEach(listener => listener());

  return {
    entries,
    listeners,
    set(id, node) {
      entries.set(id, node);
      emit();
    },
    remove(id) {
      if (!entries.has(id)) return;   // no listener churn when nothing changed
      entries.delete(id);
      emit();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

const ManagerContext = createContext<Manager | null>(null);

function PortalHost({ manager }: { manager: Manager }) {
  const [, rerender] = useReducer((count: number) => count + 1, 0);
  useEffect(() => manager.subscribe(rerender), [manager]);

  return (
    // box-none: the host never swallows a touch — only the overlays it renders do.
    // Without this the tab bar underneath would stop responding.
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {[...manager.entries.entries()].map(([id, node]) => (
        <View key={id} style={StyleSheet.absoluteFill} pointerEvents="box-none">
          {node}
        </View>
      ))}
    </View>
  );
}

export function PortalProvider({ children }: { children: React.ReactNode }) {
  const manager = useMemo(createManager, []);

  return (
    <ManagerContext.Provider value={manager}>
      <View style={{ flex: 1 }}>
        {children}
        <PortalHost manager={manager} />
      </View>
    </ManagerContext.Provider>
  );
}

// Renders `children` at the app root while `visible` is true.
export function Portal({ id, visible, children }: {
  id: string;
  visible: boolean;
  children: React.ReactNode;
}) {
  const manager = useContext(ManagerContext);

  // Runs on every render of the owner so the overlay's contents stay fresh, but it
  // only ever re-renders the host — never the owner. That is what stops the loop.
  useEffect(() => {
    if (!manager) return;
    if (visible) manager.set(id, children);
    else manager.remove(id);
  });

  useEffect(() => () => manager?.remove(id), [manager, id]);

  return null;
}
