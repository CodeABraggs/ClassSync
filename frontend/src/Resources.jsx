import { useCallback, useEffect, useState } from 'react';
import { BookOpen, Download, FileText, Folder, FolderPlus, Pencil, Search, Trash2, Upload } from 'lucide-react';
import { errorMessage } from './api';
import { Dialog, Field, fieldValue, saveDownload } from './classroomUi';


export default function Resources({ api, canEdit }) {
  const [library, setLibrary] = useState();
  const [loadError, setLoadError] = useState('');
  const [subjectId, setSubjectId] = useState(null);
  const [folderId, setFolderId] = useState(null);
  const [query, setQuery] = useState('');
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState();
  const [editing, setEditing] = useState(null);
  const [destinationSubject, setDestinationSubject] = useState();
  const [destinationFolder, setDestinationFolder] = useState('');

  const load = useCallback(async () => {
    const [subjects, folders, files] = await Promise.all([
      api.get('/subjects'),
      api.get('/resource-folders'),
      api.get('/resources'),
    ]);
    setLibrary({
      subjects: [...subjects.data].sort((a, b) => a.name.localeCompare(b.name)),
      folders: folders.data,
      files: files.data,
    });
    setLoadError('');
  }, [api]);

  useEffect(() => { load().catch(error => setLoadError(errorMessage(error))); }, [load]);

  const subject = library?.subjects.find(item => item.id === subjectId);
  const folders = library?.folders.filter(item => item.subjectId === subjectId) ?? [];
  const folder = folders.find(item => item.id === folderId);
  const subjectFiles = library?.files.filter(file => file.subjectId === subjectId) ?? [];
  const visibleFiles = subjectFiles.filter(file =>
    (file.folderId ?? null) === (folder?.id ?? null) && file.name.toLowerCase().includes(query.trim().toLowerCase())
  );

  function chooseSubject(id) {
    setFeedback(undefined);
    setSubjectId(id);
    setFolderId(null);
    setQuery('');
    setCreating(false);
  }

  function closeSubject() {
    setSubjectId(null);
    setEditing(null);
    setFeedback(undefined);
  }

  async function createFolder(event) {
    event.preventDefault();
    if (!subject || busy) return;
    const form = event.currentTarget;
    const name = String(new FormData(form).get('name')).trim();
    if (!name) {
      setFeedback({ message: 'Enter a folder name.', error: true });
      return;
    }
    setBusy(true);
    setFeedback(undefined);
    try {
      const { data } = await api.post('/resource-folders', { subjectId: subject.id, name });
      setLibrary(current => current && ({
        ...current,
        folders: [...current.folders, data].sort((a, b) => a.name.localeCompare(b.name)),
      }));
      setFolderId(data.id);
      setQuery('');
      setCreating(false);
      setFeedback({ message: 'Folder created.' });
    } catch (error) {
      setFeedback({ message: errorMessage(error), error: true });
    } finally {
      setBusy(false);
    }
  }

  async function upload(event) {
    event.preventDefault();
    if (!subject || !folder || busy) return;
    const form = event.currentTarget;
    const payload = new FormData(form);
    payload.set('subjectId', String(subject.id));
    payload.set('folderId', String(folder.id));
    setBusy(true);
    setFeedback(undefined);
    try {
      const { data } = await api.post('/resources', payload);
      setLibrary(current => current && { ...current, files: [data, ...current.files] });
      form.reset();
      setQuery('');
      setFeedback({ message: 'File uploaded.' });
    } catch (error) {
      setFeedback({ message: errorMessage(error), error: true });
    } finally {
      setBusy(false);
    }
  }

  async function download(file) {
    try {
      const { data } = await api.get('/resources/' + file.id + '/download', { responseType: 'blob' });
      saveDownload(data, file.name);
    } catch (error) {
      setFeedback({ message: errorMessage(error), error: true });
    }
  }

  function edit(file) {
    setFeedback(undefined);
    setDestinationSubject(file.subjectId);
    setDestinationFolder(file.folderId == null ? '' : String(file.folderId));
    setEditing(file);
  }

  async function saveFile(event) {
    event.preventDefault();
    if (!editing || busy) return;
    const input = {
      name: fieldValue(new FormData(event.currentTarget), 'name'),
      subjectId: destinationSubject,
      folderId: destinationFolder ? Number(destinationFolder) : null,
    };
    setBusy(true);
    setFeedback(undefined);
    try {
      const { data } = await api.put('/resources/' + editing.id, input);
      setLibrary(current => current && { ...current, files: current.files.map(file => file.id === data.id ? data : file) });
      setSubjectId(data.subjectId);
      setFolderId(data.folderId);
      setQuery('');
      setCreating(false);
      setEditing(null);
      setFeedback({ message: 'File updated.' });
    } catch (error) {
      setFeedback({ message: errorMessage(error), error: true });
    } finally {
      setBusy(false);
    }
  }

  async function remove(file) {
    if (busy || !window.confirm('Delete ' + file.name + '?')) return;
    setBusy(true);
    setFeedback(undefined);
    try {
      await api.delete('/resources/' + file.id);
      setLibrary(current => current && { ...current, files: current.files.filter(item => item.id !== file.id) });
      setFeedback({ message: 'File deleted.' });
    } catch (error) {
      setFeedback({ message: errorMessage(error), error: true });
    } finally {
      setBusy(false);
    }
  }

  if (loadError) return <section className="panel" role="alert">
    <p>{loadError}</p><button className="primary" onClick={() => load().catch(error => setLoadError(errorMessage(error)))}>Try again</button>
  </section>;
  if (!library) return <section className="panel" role="status">Loading study resources…</section>;

  return <div className="stack">
    <section className="panel">
      <div className="panel-head"><div><h2>Subjects</h2><p>Choose a subject to open its folders and files.</p></div></div>
      <div className="library-subjects">
        {library.subjects.map(item => <button key={item.id} type="button" className="library-subject"
          aria-haspopup="dialog" onClick={() => chooseSubject(item.id)} disabled={busy}>
          <span className="library-icon"><BookOpen /></span>
          <span><strong>{item.name}</strong><small>{item.code}</small></span>
        </button>)}
      </div>
      {!library.subjects.length && <p className="library-empty">{canEdit ? 'Add a subject on the Subjects page to get started.' : 'No subjects have been added yet.'}</p>}
    </section>

    {subject && <Dialog title={editing ? 'Edit file details' : subject.name} onClose={closeSubject} wide={!editing} busy={busy}>
      {editing ? (
        <form onSubmit={saveFile}>
          <Field label="File name"><input name="name" defaultValue={editing.name} maxLength={255} required /></Field>
          <Field label="Subject"><select value={destinationSubject ?? ''} onChange={event => {
            setDestinationSubject(Number(event.target.value));
            setDestinationFolder('');
          }} required>
            {library.subjects.map(subject => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
          </select></Field>
          <Field label="Folder"><select value={destinationFolder} onChange={event => setDestinationFolder(event.target.value)}>
            <option value="">Unfiled documents</option>
            {library.folders.filter(folder => folder.subjectId === destinationSubject).map(folder =>
              <option key={folder.id} value={folder.id}>{folder.name}</option>)}
          </select></Field>
          <div className="edit-actions">
            <button className="primary" disabled={busy}>Save changes</button>
            <button type="button" className="secondary" disabled={busy} onClick={() => { setEditing(null); setFeedback(undefined); }}>Back to files</button>
          </div>
        </form>
      ) : <>
        <div className="panel-head library-heading">
          <div><h3>Folders</h3><p>{folders.length} {folders.length === 1 ? 'folder' : 'folders'}</p></div>
          {canEdit && <button type="button" onClick={() => setCreating(value => !value)} disabled={busy}
            aria-expanded={creating}><FolderPlus />{creating ? 'Cancel' : 'New folder'}</button>}
        </div>
        {creating && <form className="library-inline" onSubmit={createFolder}>
          <label className="field"><span>Folder name</span><input name="name" maxLength={120} placeholder="e.g. Lecture notes" required autoFocus /></label>
          <button className="primary" disabled={busy}>Create folder</button>
        </form>}
        <div className="library-folders" aria-label="Resource folders">
          {folders.map(item => <button type="button" key={item.id} aria-pressed={item.id === folder?.id}
            onClick={() => { setFolderId(item.id); setQuery(''); setFeedback(undefined); }} disabled={busy}><Folder />{item.name}</button>)}
          {subjectFiles.some(file => file.folderId == null) && <button type="button" aria-pressed={!folder}
            disabled={busy} onClick={() => { setFolderId(null); setQuery(''); setFeedback(undefined); }}><FileText />Unfiled documents</button>}
        </div>
        {!folders.length && <p className="library-empty">{canEdit ? 'Create a folder to start uploading files.' : 'No folders have been added yet.'}</p>}

        {(folder || visibleFiles.length > 0 || query) && <div className="library-files">
          <div className="panel-head library-heading"><div><h3>{folder?.name ?? 'Unfiled documents'}</h3></div>
            <div className="resource-tools"><label><Search /><input aria-label="Search files in this folder" placeholder="Search file names"
              value={query} onChange={event => setQuery(event.target.value)} /></label></div>
          </div>
          {canEdit && folder && <form key={folder.id} className="library-inline" onSubmit={upload}>
            <label className="field"><span>Add a file to {folder.name}</span><input name="file" type="file" accept=".pdf,.ppt,.pptx,.doc,.docx" required /></label>
            <button className="primary" disabled={busy}><Upload />Upload file</button>
          </form>}
          <div className="resource-grid">
            {visibleFiles.map(file => <article key={file.id}>
              <div className="file-icon"><FileText /><b>{file.name.split('.').pop()?.toUpperCase()}</b></div>
              <div><h3>{file.name}</h3><p>{new Intl.NumberFormat(undefined, { style: 'unit', unit: 'kilobyte', maximumFractionDigits: 1 }).format(file.size / 1024)}</p></div>
              <div className="actions">
                <button type="button" onClick={() => download(file)} aria-label={'Download ' + file.name}><Download />Download</button>
                {canEdit && <>
                  <button type="button" className="icon-btn" disabled={busy} onClick={() => edit(file)} aria-label={'Edit ' + file.name}><Pencil /></button>
                  <button type="button" className="danger icon-btn" disabled={busy} onClick={() => remove(file)} aria-label={'Delete ' + file.name}><Trash2 /></button>
              </>}
            </div>
          </article>)}
        </div>
        {!visibleFiles.length && <p className="library-empty">{query ? 'No files match your search.' : 'This folder is empty.'}</p>}
      </div>}
      </>}
      {feedback && <p className="form-hint dialog-feedback" role={feedback.error ? 'alert' : 'status'}>{feedback.message}</p>}
    </Dialog>}
  </div>;
}
