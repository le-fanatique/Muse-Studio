'use client';

import { useRef, useState } from 'react';

interface ManualImageUploadButtonProps {
  sceneId?: string;
  label?: string;
  onUploaded: (relativePath: string) => Promise<void> | void;
}

export function ManualImageUploadButton({
  sceneId = 'manual-upload',
  label = 'Upload image',
  onUploaded,
}: ManualImageUploadButtonProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  async function handleFile(file: File) {
    setIsUploading(true);

    try {
      const form = new FormData();

      // The Muse Studio upload route expects "files".
      // We also send "file" for compatibility with older/local variants.
      form.append('files', file, file.name);
      form.append('file', file, file.name);
      form.append('sceneId', sceneId);

      const res = await fetch('/api/upload/reference', {
        method: 'POST',
        body: form,
      });

      const data = await res.json().catch(async () => ({ error: await res.text() }));

      if (!res.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      const rawPath =
        data.path ??
        data.imagePath ??
        data.relativePath ??
        data.url ??
        data.filePath ??
        data.paths?.[0];

      if (!rawPath) {
        throw new Error(`Upload succeeded but no path was returned: ${JSON.stringify(data)}`);
      }

      const relPath = String(rawPath)
        .replace(/^https?:\/\/[^/]+/, '')
        .replace(/^\/api\/outputs\//, '')
        .replace(/^\//, '');

      await onUploaded(relPath);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void handleFile(file);
        }}
      />

      <button
        type="button"
        disabled={isUploading}
        onClick={() => inputRef.current?.click()}
        className="rounded-md border border-white/10 px-3 py-1.5 text-xs font-medium text-white/80 hover:bg-white/10 disabled:opacity-50"
      >
        {isUploading ? 'Uploading…' : label}
      </button>
    </>
  );
}
