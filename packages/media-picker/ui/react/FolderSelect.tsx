import { useState } from 'react';

import type { JSX } from 'react';
import type { StorageProvider } from '../../core/provider.js';
import type { UseMediaPickerResult } from '../../adapters/react/use-media-picker.js';

export interface FolderSelectProps {
  picker: UseMediaPickerResult;
  provider: StorageProvider;
  value?: string;
  onChange: (folderId: string) => void;
}

/** Plain `<select>` over `picker.state.folders` (flat list, no nesting), plus an optional create-folder input when the provider supports it. */
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
    <div>
      <select
        value={value ?? ''}
        disabled={foldersLoading}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">All folders</option>
        {folders.map((folder) => (
          <option key={folder.id} value={folder.id}>
            {folder.name}
          </option>
        ))}
      </select>
      {foldersError ? <p role="alert">{foldersError.message}</p> : null}
      {canCreate ? (
        <span>
          <input
            type="text"
            value={newFolderName}
            placeholder="New folder"
            onChange={(event) => setNewFolderName(event.target.value)}
          />
          <button type="button" onClick={() => void handleCreate()}>
            Create
          </button>
        </span>
      ) : null}
    </div>
  );
}
