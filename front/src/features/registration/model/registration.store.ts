import { STORAGE_KEYS } from '@/shared/config/storage-keys';
import { createPersistedStore } from '@/shared/lib/zustand';

interface RegistrationState {
  name: string;
  email: string;
}

interface RegistrationActions {
  setName: (name: string) => void;
  setEmail: (email: string) => void;
  reset: () => void;
}

type RegistrationStore = RegistrationState & RegistrationActions;

export const useRegistrationStore = createPersistedStore<RegistrationStore>(
  'Registration',
  (set) => ({
    name: '',
    email: '',
    setName: (name) =>
      set((draft) => {
        draft.name = name;
      }),
    setEmail: (email) =>
      set((draft) => {
        draft.email = email;
      }),
    reset: () =>
      set((draft) => {
        draft.name = '';
        draft.email = '';
      }),
  }),
  { name: STORAGE_KEYS.REGISTRATION },
);
