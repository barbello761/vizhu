import { STORAGE_KEYS } from '@/shared/config/storage-keys';
import { createPersistedStore } from '@/shared/lib/zustand';

interface RegistrationState {
  name: string;
  email: string;
  blindnessTypeId: number | null;
}

interface RegistrationActions {
  setName: (name: string) => void;
  setEmail: (email: string) => void;
  setBlindnessTypeId: (id: number) => void;
  reset: () => void;
}

type RegistrationStore = RegistrationState & RegistrationActions;

export const useRegistrationStore = createPersistedStore<RegistrationStore>(
  'Registration',
  (set) => ({
    name: '',
    email: '',
    blindnessTypeId: null,
    setName: (name) =>
      set((draft) => {
        draft.name = name;
      }),
    setEmail: (email) =>
      set((draft) => {
        draft.email = email;
      }),
    setBlindnessTypeId: (id) =>
      set((draft) => {
        draft.blindnessTypeId = id;
      }),
    reset: () =>
      set((draft) => {
        draft.name = '';
        draft.email = '';
        draft.blindnessTypeId = null;
      }),
  }),
  { name: STORAGE_KEYS.REGISTRATION },
);
