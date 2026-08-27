import { useState } from 'react';

import type { JSX } from 'react';
import type { StorageProvider } from '../../../core/provider.js';
import type { UseMediaPickerResult } from '../../../adapters/react/use-media-picker.js';
import { ModernSelect } from '../ModernSelect.js';

export interface FolderSelectProps {
  picker: UseMediaPickerResult;
  provider: StorageProvider;
  value?: string;
  onChange: (folderId: string) => void;
}

/** Tailwind variant of FolderSelect — same props/behavior as headless, styled with utilities. */
export function FolderSelect({
  picker,
  provider,
  value,
  onChange,
}: FolderSelectProps): JSX.Element {
  const [newFolderName, setNewFolderName] = useState('');
  const { folders, foldersLoading, foldersError } = picker.state;
  const canCreate = typeof provider.createFolder === 'function';

  const handleCreate = async (): Promise<void> => {
    const name = newFolderName.trim();
    if (!name) return;
    const folder = await picker.createFolder(provider, name);
    setNewFolderName('');
    onChange(folder.id);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <ModernSelect
        value={value ?? ''}
        disabled={foldersLoading}
        onChange={onChange}
        options={[
          { value: '', label: 'All folders' },
          ...folders.map((folder) => ({ value: folder.id, label: folder.name })),
        ]}
        placeholder="All folders"
      />
      {foldersError ? (
        <p role="alert" className="text-sm text-red-600">
          {foldersError.message}
        </p>
      ) : null}
      {canCreate ? (
        <span className="flex items-center gap-2">
          <input
            type="text"
            value={newFolderName}
            placeholder="New folder"
            onChange={(event) => setNewFolderName(event.target.value)}
            className="rounded-md border border-zinc-300 px-2 py-1.5 text-sm"
          />
          <button
            type="button"
            onClick={() => void handleCreate()}
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-50"
          >
            Create
          </button>
        </span>
      ) : null}
    </div>
  );
}
