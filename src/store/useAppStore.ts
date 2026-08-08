import { create } from 'zustand';
import { UserProfile } from '../hooks/useTelegramAuth';

interface AppState {
  profile: UserProfile | null;
  balanceRub: number;
  coins: number;
  activeTable: string | null;
  tables: { name: string; rowCount: number }[];
  selectedRowForDelete: { tableName: string; rowId: string } | null;
  selectedRowForEdit: { tableName: string; rowData: any } | null;

  setProfile: (profile: UserProfile | null) => void;
  updateBalances: (rub: number, coins: number) => void;
  setTables: (tables: { name: string; rowCount: number }[]) => void;
  setActiveTable: (table: string | null) => void;
  setSelectedRowForDelete: (row: { tableName: string; rowId: string } | null) => void;
  setSelectedRowForEdit: (row: { tableName: string; rowData: any } | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  profile: null,
  balanceRub: 0,
  coins: 0,
  activeTable: null,
  tables: [],
  selectedRowForDelete: null,
  selectedRowForEdit: null,

  setProfile: (profile) => set({
    profile,
    balanceRub: (profile as any)?.balance_rub ?? (profile as any)?.balance ?? 0,
    coins: (profile as any)?.coins ?? 0
  }),
  updateBalances: (rub, coins) => set({ balanceRub: rub, coins }),
  setTables: (tables) => set({ tables }),
  setActiveTable: (activeTable) => set({ activeTable }),
  setSelectedRowForDelete: (selectedRowForDelete) => set({ selectedRowForDelete }),
  setSelectedRowForEdit: (selectedRowForEdit) => set({ selectedRowForEdit })
}));
