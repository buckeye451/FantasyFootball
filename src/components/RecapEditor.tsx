'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

type Stage = 'closed' | 'pin' | 'editing';

/**
 * "Make a post" with a PIN gate. The PIN is never in this bundle — it's checked
 * server-side, both to unlock the editor and again when the post is submitted.
 */
export function RecapEditor({ season }: { season: string }) {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>('closed');
  const [pin, setPin] = useState('');
  const [title, setTitle] = useState('');
  const [preheader, setPreheader] = useState('');
  const [body, setBody] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const close = () => {
    setStage('closed');
    setPin('');
    setTitle('');
    setPreheader('');
    setBody('');
    setFiles([]);
    setError(null);
  };

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
      for (const f of files) form.append('images', f);

      const res = await fetch('/api/recaps', { method: 'POST', body: form });
      const data = (await res.json().catch(() => ({}))) as { error?: string; rejected?: number };
      if (!res.ok) {
        setError(data.error ?? 'Could not save the post.');
        return;
      }
      close();
      router.refresh();
    } catch {
      setError('Could not save the post.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button type="button" className="post-button" onClick={() => setStage('pin')}>
        ✍️ Make a post
      </button>

      {stage !== 'closed' && (
        <div className="modal-backdrop" onClick={close}>
          <div
            className={`modal${stage === 'editing' ? ' wide' : ''}`}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={stage === 'pin' ? 'Enter PIN' : 'New recap post'}
          >
            {stage === 'pin' ? (
              <form onSubmit={checkPin}>
                <h3 className="modal-title">Enter PIN</h3>
                <p className="card-note">Posting is limited to the commissioner.</p>
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
            ) : (
              <form onSubmit={submit}>
                <h3 className="modal-title">New {season} recap</h3>
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
                <label className="field">
                  <span>Images (optional)</span>
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
                  <button type="button" className="btn-ghost" onClick={close}>
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={busy || !title.trim() || !body.trim()}
                  >
                    {busy ? 'Posting…' : 'Publish'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
