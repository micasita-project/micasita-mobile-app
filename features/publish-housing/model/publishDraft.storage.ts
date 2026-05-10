import AsyncStorage from '@react-native-async-storage/async-storage';
import type { HousingDraft } from '@/shared/types';

const STORAGE_KEY = 'publish_draft';

export const isDraftEmpty = (draft: HousingDraft): boolean => {
  return (
    !draft.address.trim() &&
    !draft.title.trim() &&
    draft.price === 0 &&
    draft.localImageUris.length === 0 &&
    !draft.description.trim()
  );
};

export const savePublishDraft = async (draft: HousingDraft): Promise<void> => {
  if (isDraftEmpty(draft)) {
    return;
  }
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  } catch (error) {
    console.error('Error saving publish draft:', error);
  }
};

export const getPublishDraft = async (): Promise<HousingDraft | null> => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Error getting publish draft:', error);
    return null;
  }
};

export const clearPublishDraft = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Error clearing publish draft:', error);
  }
};
