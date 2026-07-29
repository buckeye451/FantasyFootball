'use client';

/* eslint-disable @next/next/no-img-element */
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { Recap } from '@/lib/recaps';

type Stage = 'closed' | 'pin' | 'editing' | 'confirmDelete';

/**
 * Create or edit a recap, behind a PIN gate. The PIN is never in this bundle —
 * it's checked server-side to unlock, and again on every write.
 *
 * Pass `recap` to edit that post; omit it to write a new one.
 */
export function RecapEditor({ season, recap }: { season: string; recap?: Recap }) {
  const router = useRouter();
  const isEdit = !!recap;

  const [stage, setStage] = useState<Stage>('closed');
  const [pin, setPin] = useState('');
  const [title, setTitle] = useState(recap?.title ?? '');
  const [preheader, setPreheader] = useState(recap?.preheader ?? '');
  const [body, setBody] = useState(recap?.body ?? '');
  const [keep, setKeep] = useState<string[]>(recap?.images ?? []);
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function close() {
    setStage('closed');
    setPin('');
    setError(null);
    setFiles([]);
    // Editing reverts to the saved post; creating clears the form.
    setTitle(recap?.title ?? '');
    setPreheader(recap?.preheader ?? '');
    setBody(recap?.body ?? '');
    setKeep(recap?.images ?? []);
  }

  async function checkPin(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/recaps/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });
      if (res.ok) setStage('editing');
      else setError('That PIN is not right.');
    } catch {
      setError('Could not reach the server.');
    } finally {
      setBusy(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.set('pin', pin);
      form.set('season', season);
      form.set('title', title);
      form.set('preheader', preheader);
      form.set('body', body);
      if (isEdit) form.set('keep', JSON.stringify(keep));
      for (const f of files) form.append('images', f);

      const res = await fetch(isEdit ? `/api/recaps/${recap!.id}` : '/api/recaps', {
        method: isEdit ? 'PATCH' : 'POST',
        body: form,
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? 'Could not save the post.');
        return;
      }
      setStage('closed');
      setPin('');
      setFiles([]);
      router.refresh();
    } catch {
      setError('Could not save the post.');
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/recaps/${recap!.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? 'Could not delete the post.');
        setStage('editing');
        return;
      }
      close();
      router.refresh();
    } catch {
      setError('Could not delete the post.');
      setStage('editing');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        className={isEdit ? 'post-action' : 'post-button'}
        onClick={() => setStage('pin')}
      >
        {isEdit ? 'Edit' : '✍️ Make a post'}
      </button>

      {stage !== 'closed' && (
        <div className="modal-backdrop" onClick={close}>
          <div
            className={`modal${stage === 'editing' ? ' wide' : ''}`}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            {stage === 'pin' && (
              <form onSubmit={checkPin}>
                <h3 className="modal-title">Enter PIN</h3>
                <p className="card-note">
                  {isEdit ? 'Editing is limited to the commissioner.' : 'Posting is limited to the commissioner.'}
                </p>
                <input
                  className="modal-input"
                  type="password"
                  inputMode="numeric"
                  autoComplete="off"
                  autoFocus
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="••••"
                />
                {error && <p className="modal-error">{error}</p>}
                <div className="modal-actions">
                  <button type="button" className="btn-ghost" onClick={close}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary" disabled={busy || !pin}>
                    {busy ? 'Checking…' : 'Unlock'}
                  </button>
                </div>
              </form>
            )}

            {stage === 'editing' && (
              <form onSubmit={submit}>
                <h3 className="modal-title">{isEdit ? 'Edit post' : `New ${season} recap`}</h3>
                <label className="field">
                  <span>Heading</span>
                  <input
                    className="modal-input"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Week 5: the wheels came off"
                    autoFocus
                  />
                </label>
                <label className="field">
                  <span>Preheader</span>
                  <input
                    className="modal-input"
                    value={preheader}
                    onChange={(e) => setPreheader(e.target.value)}
                    placeholder="One line under the heading"
                  />
                </label>
                <label className="field">
                  <span>Post</span>
                  <textarea
                    className="modal-input modal-textarea"
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    rows={10}
                    placeholder="Write the recap…"
                  />
                </label>

                {isEdit && keep.length > 0 && (
                  <div className="field">
                    <span>Current images</span>
                    <div className="edit-images">
                      {keep.map((name) => (
                        <div className="edit-image" key={name}>
                          <img src={`/api/uploads/${name}`} alt="" />
                          <button
                            type="button"
                            className="edit-image-remove"
                            aria-label="Remove image"
                            onClick={() => setKeep((k) => k.filter((n) => n !== name))}
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <label className="field">
                  <span>{isEdit ? 'Add images' : 'Images (optional)'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
                  />
                  {files.length > 0 && (
                    <span className="card-note">
                      {files.length} image{files.length === 1 ? '' : 's'} attached
                    </span>
                  )}
                </label>

                {error && <p className="modal-error">{error}</p>}
                <div className="modal-actions">
                  {isEdit && (
                    <button
                      type="button"
                      className="btn-danger"
                      onClick={() => setStage('confirmDelete')}
                    >
                      Delete
                    </button>
                  )}
                  <span className="modal-spacer" />
                  <button type="button" className="btn-ghost" onClick={close}>
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={busy || !title.trim() || !body.trim()}
                  >
                    {busy ? 'Saving…' : isEdit ? 'Save changes' : 'Publish'}
                  </button>
                </div>
              </form>
            )}

            {stage === 'confirmDelete' && (
              <div>
                <h3 className="modal-title">Delete this post?</h3>
                <p className="card-note">
                  &ldquo;{recap?.title}&rdquo; and its images will be removed. This can&rsquo;t be
                  undone.
                </p>
                {error && <p className="modal-error">{error}</p>}
                <div className="modal-actions">
                  <button type="button" className="btn-ghost" onClick={() => setStage('editing')}>
                    Keep it
                  </button>
                  <button type="button" className="btn-danger" onClick={remove} disabled={busy}>
                    {busy ? 'Deleting…' : 'Delete post'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
