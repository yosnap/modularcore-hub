import { useState } from 'react';

import type { JSX } from 'react';
import type { StorageProvider } from '../../../core/provider.js';
import type { UseMediaPickerResult } from '../../../adapters/react/use-media-picker.js';

import '../../vanilla-styles.css';

export interface FolderSelectProps {
  picker: UseMediaPickerResult;
  provider: StorageProvider;
  value?: string;
  onChange: (folderId: string) => void;
}

/** Vanilla CSS variant of FolderSelect — same props/behavior as headless. */
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
    <div className="mc-field">
      <select
        value={value ?? ''}
        disabled={foldersLoading}
        onChange={(event) => onChange(event.target.value)}
        className="mc-select"
      >
        <option value="">All folders</option>
        {folders.map((folder) => (
          <option key={folder.id} value={folder.id}>
            {folder.name}
          </option>
        ))}
      </select>
      {foldersError ? (
        <p role="alert" className="mc-alert">
          {foldersError.message}
        </p>
      ) : null}
      {canCreate ? (
        <span>
          <input
            type="text"
            value={newFolderName}
            placeholder="New folder"
            onChange={(event) => setNewFolderName(event.target.value)}
            className="mc-input"
          />
          <button type="button" onClick={() => void handleCreate()} className="mc-button">
            Create
          </button>
        </span>
      ) : null}
    </div>
  );
}
