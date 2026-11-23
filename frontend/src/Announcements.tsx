import type { AxiosInstance } from 'axios';
import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { errorMessage } from './api';
import { Dialog, Field, SubjectSelect, fieldValue, localInput, subjectId } from './classroomUi';
import type { Announcement, Subject } from './classroomUi';
import { AnnouncementDialog, AnnouncementPreview } from './AnnouncementPreview';

export default function Announcements({ api, canEdit, note }: {
  api: AxiosInstance; canEdit: boolean; note: (message: string) => void;
}) {
  const [items, setItems] = useState<Announcement[]>();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [editing, setEditing] = useState<Announcement | null>();
  const [openId, setOpenId] = useState<number>();
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');
  const [error, setError] = useState('');
  const [revision, refresh] = useState(0);
  const path = canEdit ? '/admin/announcements' : '/announcements';
  const openAnnouncement = items?.find(item => item.id === openId);

  useEffect(() => {
    const controller = new AbortController();
    const read = () => api.get<Announcement[]>(path, { signal: controller.signal })
      .then(({ data }) => { setItems(data); setError(''); })
      .catch(error => { if (!controller.signal.aborted) setError(errorMessage(error)); });
    read();
    const timer = window.setInterval(read, 30_000);
    return () => { controller.abort(); window.clearInterval(timer); };
  }, [api, path, revision]);

  useEffect(() => {
    if (canEdit) api.get<Subject[]>('/subjects').then(({ data }) => setSubjects(data)).catch(error => note(errorMessage(error)));
  }, [api, canEdit, note]);

  function openEditor(item: Announcement | null) {
    setFormError('');
    setEditing(item);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const data = new FormData(event.currentTarget);
    const schedule = fieldValue(data, 'publishAt');
    const date = schedule ? new Date(schedule) : null;
    if (date && !Number.isFinite(date.getTime())) {
      setFormError('Choose a valid publication date and time.');
      return;
    }
    const publishAt = date?.toISOString() ?? null;
    const input = {
      title: fieldValue(data, 'title'), content: fieldValue(data, 'content'),
      priority: fieldValue(data, 'priority'), subjectId: subjectId(data), publishAt,
    };
    setBusy(true);
    setFormError('');
    try {
      if (editing) await api.put('/announcements/' + editing.id, input);
      else await api.post('/announcements', input);
      setEditing(undefined);
      refresh(value => value + 1);
      note(editing ? 'Announcement updated.' : publishAt && Date.parse(publishAt) > Date.now()
        ? 'Announcement scheduled.' : 'Announcement published.');
    } catch (error) {
      setFormError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function remove(item: Announcement) {
    if (!window.confirm('Delete “' + item.title + '”?')) return;
    setBusy(true);
    try {
      await api.delete('/announcements/' + item.id);
      refresh(value => value + 1);
      note('Announcement deleted.');
    } catch (error) {
      note(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  return <div className="stack">
    {canEdit && <div className="edit-actions page-actions">
      <button className="primary" aria-haspopup="dialog" disabled={busy} onClick={() => openEditor(null)}><Plus />Add announcement</button>
    </div>}
    {canEdit && editing !== undefined && <Dialog title={editing ? 'Edit announcement' : 'Add announcement'} onClose={() => setEditing(undefined)} busy={busy}>
      <form key={editing?.id ?? 'new'} onSubmit={save}>
        <Field label="Title"><input name="title" defaultValue={editing?.title} maxLength={180} required /></Field>
        <Field label="Message"><textarea name="content" defaultValue={editing?.content} maxLength={10000} required /></Field>
        <div className="split">
          <Field label="Priority"><select name="priority" defaultValue={editing?.priority ?? 'NORMAL'}>
            <option value="NORMAL">Normal</option><option value="IMPORTANT">Important</option>
          </select></Field>
          <SubjectSelect subjects={subjects} value={editing?.subjectId} />
        </div>
        <Field label="Publish date and time (optional)">
          <input name="publishAt" type="datetime-local" step="1" defaultValue={localInput(editing?.publishAt)} />
        </Field>
        <p className="form-hint">Leave blank to publish immediately. Times use your device’s time zone.</p>
        {formError && <p className="form-hint dialog-feedback" role="alert">{formError}</p>}
        <div className="edit-actions">
          <button className="primary" disabled={busy}>{editing ? 'Save changes' : 'Save announcement'}</button>
          <button type="button" className="secondary" disabled={busy} onClick={() => setEditing(undefined)}>Cancel</button>
        </div>
      </form>
    </Dialog>}
    <section className="panel">
      <div className="panel-head"><div><h2>Class feed</h2><p>{items ? `${items.length} announcements` : 'Class announcements'}</p></div></div>
      {error && <p className="form-hint" role="alert">{error} <button className="secondary" onClick={() => refresh(value => value + 1)}>Retry</button></p>}
      {!items && !error && <p role="status">Loading announcements…</p>}
      <div className="ann-list">{items?.map(item => (
        <article key={item.id} className={item.priority === 'IMPORTANT' ? 'important' : ''}>
          <AnnouncementPreview item={item} onOpen={() => setOpenId(item.id)} />
          {canEdit && <div className="actions edit-actions">
            <button type="button" className="icon-btn" aria-label={'Edit ' + item.title} aria-haspopup="dialog" disabled={busy} onClick={() => openEditor(item)}><Pencil /></button>
            <button type="button" className="danger icon-btn" aria-label={'Delete ' + item.title} disabled={busy} onClick={() => remove(item)}><Trash2 /></button>
          </div>}
        </article>
      ))}</div>
      {items?.length === 0 && <p className="library-empty">No announcements yet.</p>}
    </section>
    {openAnnouncement && <AnnouncementDialog item={openAnnouncement} onClose={() => setOpenId(undefined)} />}
  </div>;
}
