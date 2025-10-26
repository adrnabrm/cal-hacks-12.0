'use client';
import { Pencil, Trash2, Plus, Check } from 'lucide-react';
import { TabNamesMap, TreesMap } from '../lib/types';

interface Props {
  trees: TreesMap;
  tabNames: TabNamesMap;
  activeTab: string;
  editingTab: string | null;
  newTabName: string;
  onSetActive: (id: string) => void;
  onAdd: () => void;
  onDelete: (id: string) => void;
  onStartRename: (id: string) => void;
  onConfirmRename: (id: string) => void;
  onRenameInput: (v: string) => void;
}

export default function TabsBar({
  trees,
  tabNames,
  activeTab,
  editingTab,
  newTabName,
  onSetActive,
  onAdd,
  onDelete,
  onStartRename,
  onConfirmRename,
  onRenameInput,
}: Props) {
  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 flex flex-wrap gap-2 justify-center">
      {Object.keys(trees).map((key) => (
        <div key={key} className="flex items-center bg-white rounded-full shadow px-2 py-1">
          {editingTab === key ? (
            <>
              <input
                className="border border-green-300 rounded-full px-2 text-sm w-28 focus:ring-1 focus:ring-green-500"
                value={newTabName}
                onChange={(e) => onRenameInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && onConfirmRename(key)}
              />
              <button onClick={() => onConfirmRename(key)}>
                <Check className="w-4 h-4 text-green-600" />
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => onSetActive(key)}
                className={`px-3 py-1 rounded-full font-semibold ${
                  activeTab === key
                    ? 'bg-green-600 text-white'
                    : 'bg-green-100 hover:bg-green-200 text-green-700'
                }`}
              >
                {tabNames[key]}
              </button>
              <button onClick={() => onStartRename(key)}>
                <Pencil className="w-4 h-4 text-green-600" />
              </button>
              <button onClick={() => onDelete(key)}>
                <Trash2 className="w-4 h-4 text-red-600" />
              </button>
            </>
          )}
        </div>
      ))}
      <button
        onClick={onAdd}
        disabled={Object.keys(trees).length >= 5}
        className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-full shadow-md transition-all"
      >
        <Plus className="w-4 h-4" /> Add Tree
      </button>
    </div>
  );
}
