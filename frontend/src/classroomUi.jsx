import { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';


export function formatTime(value) {
  return new Date(value).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}

export function localInput(value) {
  if (!value) return '';
  const date = new Date(value);
  const localTime = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localTime.toISOString().slice(0, 19);
}

export function fieldValue(data, name) {
  return String(data.get(name) ?? '');
}

export function subjectId(data) {
  const value = fieldValue(data, 'subjectId');
  return value ? Number(value) : null;
}

export function Field({ label, children, className = '' }) {
  return <label className={'field ' + className}><span>{label}</span>{children}</label>;
}

export function SubjectSelect({ subjects, value }) {
  return <Field label="Subject"><select name="subjectId" defaultValue={value ?? ''}>
    <option value="">General</option>
    {value != null && !subjects.some(subject => subject.id === value) && <option value={value}>Current subject</option>}
    {subjects.map(subject => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
  </select></Field>;
}

export function Heading({ icon, title, sub }) {
  return <div className="heading"><span>{icon}</span><div><h2>{title}</h2><p>{sub}</p></div></div>;
}

export function Dialog({ title, children, onClose, wide = false, busy = false }) {
  const ref = useRef(null);
  const heading = useRef(null);
  const titleId = useId();
  useEffect(() => { ref.current?.showModal(); }, []);
  useEffect(() => { heading.current?.focus(); }, [title]);

  return <dialog ref={ref} className={wide ? 'class-dialog wide-dialog' : 'class-dialog'} aria-labelledby={titleId} onClose={onClose}
    onCancel={event => { if (busy) event.preventDefault(); }}
    onClick={event => { if (!busy && event.target === event.currentTarget) event.currentTarget.close(); }}>
    <div className="class-dialog-inner">
      <header><h2 ref={heading} id={titleId} tabIndex={-1}>{title}</h2>
        <button type="button" className="icon-btn" aria-label="Close dialog" disabled={busy} onClick={() => ref.current?.close()}><X /></button>
      </header>
      {children}
    </div>
  </dialog>;
}

export function saveDownload(blob, name) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
