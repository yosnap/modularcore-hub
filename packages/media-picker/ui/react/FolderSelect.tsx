import { useState } from 'react';

import type { JSX } from 'react';
import type { StorageProvider } from '../../core/provider.js';
import type { UseMediaPickerResult } from '../../adapters/react/use-media-picker.js';
import { ModernSelect } from './ModernSelect.js';

export interface FolderSelectProps {
  picker: UseMediaPickerResult;
  provider: StorageProvider;
  value?: string;
  onChange: (folderId: string) => void;
}

/** Selector de carpetas plano, más un input opcional para crear carpetas. */
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
      <ModernSelect
        value={value ?? ''}
        disabled={foldersLoading}
        onChange={onChange}
        options={[
          { value: '', label: 'Todas las carpetas' },
          ...folders.map((folder) => ({ value: folder.id, label: folder.name })),
        ]}
        placeholder="Todas las carpetas"
      />
      {foldersError ? <p role="alert">{foldersError.message}</p> : null}
      {canCreate ? (
        <span>
          <input
            type="text"
            value={newFolderName}
            placeholder="Nueva carpeta"
            onChange={(event) => setNewFolderName(event.target.value)}
          />
          <button type="button" onClick={() => void handleCreate()}>
            Crear
          </button>
        </span>
      ) : null}
    </div>
  );
}
