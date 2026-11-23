import { createContext, useContext, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Bell, BookOpen, CalendarDays, Check, Copy, Eye, EyeOff, FileText, GraduationCap, LayoutDashboard, Link2, LogOut, Megaphone, Pencil, Plus, Trash2, X } from 'lucide-react';
import { api, createReaderApi, errorMessage, initCsrf } from './api';
import Announcements from './Announcements';
import ClassCalendar from './ClassCalendar';
import Overview from './Overview';
import Resources from './Resources';
import { Dialog, Field, Heading, fieldValue } from './classroomUi';
import type { Subject } from './classroomUi';

type Me = { id: number; name: string; email: string; role: 'CR' };
type Classroom = { name: string };
const ApiContext = createContext(api);
const useApi = () => useContext(ApiContext);

const navigation = [
  { id: 'dashboard', label: 'Overview', icon: LayoutDashboard, title: 'Class overview', description: 'See what’s happening in your class.' },
  { id: 'announcements', label: 'Announcements', icon: Megaphone, title: 'Announcements', description: 'Updates from your class representative.' },
  { id: 'calendar', label: 'Calendar', icon: CalendarDays, title: 'Academic calendar', description: 'Exams, deadlines, and class events.' },
  { id: 'resources', label: 'Resources', icon: FileText, title: 'Study resources', description: 'Browse study materials by subject and folder.' },
  { id: 'subjects', label: 'Subjects', icon: BookOpen, title: 'Subjects', description: 'Manage subjects for your classroom.' },
];

export default function App() {
  return window.location.pathname.replace(/\/$/, '') === '/classroom' ? <SharedClassroom /> : <CrApp />;
}

function CrApp() {
  const [me, setMe] = useState<Me | null>();
  useEffect(() => {
    initCsrf().then(() => api.get<Me>('/auth/me')).then(result => setMe(result.data)).catch(() => setMe(null));
  }, []);

  if (me === undefined) return <Loading text="Opening your workspace" />;
  if (!me) return <Auth done={setMe} />;
  return <Workspace me={me} onLogout={() => setMe(null)} />;
}

function SharedClassroom() {
  const [token] = useState(() => window.location.hash.slice(1));
  const [readerApi] = useState(() => createReaderApi(token));
  const [status, setStatus] = useState<'loading' | 'invalid' | 'offline' | Classroom>(token ? 'loading' : 'invalid');

  useEffect(() => {
    if (!token) return;
    readerApi.get<Classroom>('/classroom').then(({ data }) => setStatus(data)).catch(error => {
      setStatus([401, 403].includes(error.response?.status) ? 'invalid' : 'offline');
    });
  }, [readerApi, token]);

  if (status === 'loading') return <Loading text="Opening the classroom" />;
  if (typeof status === 'string') return (
    <main className="loading">
      <Logo />
      <h1>{status === 'invalid' ? 'Classroom link unavailable' : 'Couldn’t reach the classroom'}</h1>
      <p>{status === 'invalid' ? 'Open the full link shared by your class representative.' : 'Check your connection and reload the page.'}</p>
    </main>
  );

  return <ApiContext.Provider value={readerApi}><Workspace initialClassroom={status} /></ApiContext.Provider>;
}

function Loading({ text }: { text: string }) {
  return <main className="loading"><Logo /><div className="spinner" /><p>{text}</p></main>;
}

function Workspace({ me, onLogout, initialClassroom }: { me?: Me; onLogout?: () => void; initialClassroom?: Classroom }) {
  const classroomApi = useApi();
  const [classroom, setClassroom] = useState(initialClassroom);
  const [renaming, setRenaming] = useState(false);
  const [savingName, setSavingName] = useState(false);
  const [renameError, setRenameError] = useState('');
  const [tab, setTab] = useState('dashboard');
  const [message, setMessage] = useState('');
  const [menu, setMenu] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [sharing, setSharing] = useState(false);
  const pages = me ? navigation : navigation.filter(page => page.id !== 'subjects');
  const page = pages.find(item => item.id === tab) ?? pages[0];
  const canManageClassroom = !!me && tab === 'dashboard';

  useEffect(() => {
    if (initialClassroom) return;
    const controller = new AbortController();
    classroomApi.get<Classroom>('/classroom', { signal: controller.signal })
      .then(({ data }) => setClassroom(current => current ?? data))
      .catch(error => { if (!controller.signal.aborted) setMessage(errorMessage(error)); });
    return () => controller.abort();
  }, [classroomApi, initialClassroom]);

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(''), 3500);
    return () => clearTimeout(timer);
  }, [message]);

  async function share() {
    setSharing(true);
    try {
      const { data } = await api.post<{ token: string }>('/admin/classroom-share');
      const url = new URL('/classroom', window.location.origin);
      url.hash = data.token;
      setShareUrl(url.href);
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setSharing(false);
    }
  }

  async function rename(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (savingName) return;
    const name = fieldValue(new FormData(event.currentTarget), 'name').trim();
    if (!name) {
      setRenameError('Enter a classroom name.');
      return;
    }
    setSavingName(true);
    setRenameError('');
    try {
      const { data } = await classroomApi.put<Classroom>('/classroom', { name });
      setClassroom(data);
      setRenaming(false);
      setMessage('Classroom renamed.');
    } catch (error) {
      setRenameError(errorMessage(error));
    } finally {
      setSavingName(false);
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setMessage('Classroom link copied.');
    } catch {
      const input = document.getElementById('classroom-link') as HTMLInputElement | null;
      input?.focus();
      input?.select();
      setMessage('Link selected. Use your device’s copy command.');
    }
  }

  return (
    <div className="app">
      <aside className={menu ? 'sidebar open' : 'sidebar'}>
        <button className="close" aria-label="Close navigation" onClick={() => setMenu(false)}><X /></button>
        <Logo />
        <div className="class-chip"><BookOpen /><div><b>{classroom?.name ?? 'Classroom'}</b><span>{me ? 'Academic workspace' : 'Shared classroom'}</span></div></div>
        <nav>
          <small>{me ? 'WORKSPACE' : 'CLASSROOM'}</small>
          {pages.map(({ id, label, icon: Icon }) => (
            <button key={id} className={tab === id ? 'active' : ''} aria-current={tab === id ? 'page' : undefined}
              onClick={() => { setTab(id); setMenu(false); }}><Icon />{label}{tab === id && <i />}</button>
          ))}
        </nav>
        {me && <footer><Avatar name={me.name} /><div><b>{me.name}</b><span>Class representative</span></div>
          <button aria-label="Sign out" onClick={async () => {
            try { await api.post('/auth/logout'); onLogout?.(); } catch (error) { setMessage(errorMessage(error)); }
          }}><LogOut /></button></footer>}
      </aside>
      {menu && <div className="scrim" onClick={() => setMenu(false)} />}
      <main className="main">
        <div className="mobile-head"><button aria-label="Open navigation" onClick={() => setMenu(true)} className="hamb"><i /><i /><i /></button><Logo />{me && <Avatar name={me.name} />}</div>
        <header>
          <div className="workspace-title"><small>{me ? 'CR WORKSPACE' : 'SHARED CLASSROOM'}</small>
            <h1>{tab === 'dashboard' ? classroom?.name ?? page.title : page.title}</h1><p>{page.description}</p></div>
          {canManageClassroom && <div className="edit-actions workspace-actions">
            <button className="secondary" aria-haspopup="dialog" onClick={() => { setRenameError(''); setRenaming(true); }}><Pencil />Rename classroom</button>
            <button className="primary share-classroom" onClick={share} disabled={sharing}><Link2 />{sharing ? 'Opening…' : 'Share classroom'}</button>
          </div>}
        </header>
        {canManageClassroom && renaming && <Dialog title="Rename classroom" onClose={() => setRenaming(false)} busy={savingName}>
          <form onSubmit={rename}>
            <Field label="Classroom name"><input name="name" defaultValue={classroom?.name} maxLength={120} required /></Field>
            {renameError && <p className="form-hint dialog-feedback" role="alert">{renameError}</p>}
            <div className="edit-actions">
              <button className="primary" disabled={savingName}>{savingName ? 'Saving…' : 'Save name'}</button>
              <button className="secondary" type="button" disabled={savingName} onClick={() => setRenaming(false)}>Cancel</button>
            </div>
          </form>
        </Dialog>}
        {canManageClassroom && shareUrl && <section className="panel share-panel" aria-label="Share classroom">
          <Heading icon={<Link2 />} title="Classroom link" sub="Anyone with this link can view your classroom and download study materials." />
          <div className="share-actions">
            <input id="classroom-link" aria-label="Classroom link" value={shareUrl} readOnly onFocus={event => event.currentTarget.select()} />
            <button className="primary" onClick={copyLink}><Copy />Copy link</button>
            <a className="preview-link" href={shareUrl} target="_blank" rel="noreferrer">Open viewer</a>
            <button className="icon-btn" onClick={() => setShareUrl('')} aria-label="Close sharing panel"><X /></button>
          </div>
        </section>}
        {message && <div className="toast" role="status"><Check />{message}</div>}
        {tab === 'dashboard' && <Overview api={classroomApi} go={setTab} />}
        {tab === 'announcements' && <Announcements api={classroomApi} canEdit={!!me} note={setMessage} />}
        {tab === 'calendar' && <ClassCalendar api={classroomApi} canEdit={!!me} note={setMessage} />}
        {tab === 'resources' && <Resources api={classroomApi} canEdit={!!me} />}
        {tab === 'subjects' && me && <Subjects note={setMessage} />}
      </main>
    </div>
  );
}
function Logo(){return <div className="logo"><span><GraduationCap/></span>ClassSync</div>}function Avatar({name}:{name:string}){return <i className="avatar">{name.split(' ').slice(0,2).map(x=>x[0]).join('').toUpperCase()}</i>}
function Auth({ done }: { done: (me: Me) => void }) {
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setMessage('');
    try {
      await initCsrf();
      const { data } = await api.post<Me>('/auth/login', { email: form.get('email'), password: form.get('password') });
      done(data);
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth">
      <section className="showcase"><Logo /><div><h1>Your class.<br />Perfectly in sync.</h1><p>Share class announcements, deadlines, and study materials in one place.</p></div></section>
      <section className="auth-side">
        <div className="auth-card">
          <div className="mobile-logo"><Logo /></div>
          <small>CLASS REPRESENTATIVE</small>
          <h2>Sign in to ClassSync</h2>
          <p>Looking for your class? Open the link shared by your class representative.</p>
          <form onSubmit={submit}>
            <Field label="Email address"><input name="email" type="email" autoComplete="username" placeholder="you@example.com" required /></Field>
            <Field label="Password"><div className="password-input">
              <input name="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" required />
              <button type="button" onClick={() => setShowPassword(value => !value)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff /> : <Eye />}</button>
            </div></Field>
            <button className="primary full" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
          </form>
          {message && <div className="form-msg" role="alert"><Bell />{message}</div>}
        </div>
      </section>
    </main>
  );
}
function Subjects({ note }: { note: (message: string) => void }) {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [editing, setEditing] = useState<Subject | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get<Subject[]>('/subjects').then(({ data }) => setSubjects(data)).catch(error => note(errorMessage(error)));
  }, [note]);

  async function saveSubject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const input = { name: data.get('name'), code: data.get('code') };
    setSaving(true);
    try {
      const response = editing
        ? await api.put<Subject>('/subjects/' + editing.id, input) : await api.post<Subject>('/subjects', input);
      setSubjects(current => editing ? current.map(subject => subject.id === editing.id ? response.data : subject) : [...current, response.data]);
      form.reset();
      setEditing(null);
      note(editing ? 'Subject updated.' : 'Subject added to Resources.');
    } catch (error) {
      note(errorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  async function deleteSubject(subject: Subject) {
    if (!window.confirm('Delete “' + subject.name + '”?')) return;
    setSaving(true);
    try {
      await api.delete('/subjects/' + subject.id);
      setSubjects(current => current.filter(item => item.id !== subject.id));
      if (editing?.id === subject.id) setEditing(null);
    } catch {
      note('Could not delete this subject. It may still be in use.');
    } finally {
      setSaving(false);
    }
  }

  return <section className="panel">
    <Heading icon={editing ? <Pencil /> : <BookOpen />} title={editing ? 'Edit subject' : 'Subjects'} sub="Every subject appears in the resource library." />
    <form key={editing?.id ?? 'new'} className="form-grid" onSubmit={saveSubject}>
      <Field label="Subject name"><input name="name" placeholder="Database Management Systems" maxLength={120} defaultValue={editing?.name} autoFocus={!!editing} required /></Field>
      <Field label="Subject code"><input name="code" placeholder="DBMS" maxLength={30} defaultValue={editing?.code} required /></Field>
      <div className="edit-actions wide">
        <button className="primary" disabled={saving}>{editing ? <Pencil /> : <Plus />}{editing ? 'Save changes' : 'Add subject'}</button>
        {editing && <button type="button" className="secondary" disabled={saving} onClick={() => setEditing(null)}>Cancel</button>}
      </div>
    </form>
    <div className="subjects">{subjects.map((subject, index) => <article key={subject.id}>
      <i className={'c' + index % 5} /><div><b>{subject.name}</b><span>{subject.code}</span></div>
      <div className="actions edit-actions">
        <button className="icon-btn" aria-label={'Edit ' + subject.name} disabled={saving} onClick={() => setEditing(subject)}><Pencil /></button>
        <button className="danger icon-btn" aria-label={'Delete ' + subject.name} disabled={saving} onClick={() => deleteSubject(subject)}><Trash2 /></button>
      </div>
    </article>)}</div>
  </section>;
}
