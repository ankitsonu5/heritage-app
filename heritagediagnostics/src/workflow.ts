import AsyncStorage from '@react-native-async-storage/async-storage';

// UI progress is not authentication data. Logging out removes the token, but a
// person who signs back into the same account should reopen the order/tab they
// were working on. Keys include the server account id so two people sharing one
// phone can never inherit each other's draft or selection.
export const workflowKey = (accountId: string | undefined, area: string) =>
  accountId ? `workflow:${accountId}:${area}` : null;

export async function readWorkflow<T>(key: string | null): Promise<T | null> {
  if (!key) return null;
  try {
    const value = await AsyncStorage.getItem(key);
    return value ? JSON.parse(value) as T : null;
  } catch {
    return null;
  }
}

export async function writeWorkflow<T>(key: string | null, value: T) {
  if (!key) return;
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

export async function clearWorkflow(key: string | null) {
  if (key) await AsyncStorage.removeItem(key);
}
