import { useEffect, useId, useRef } from 'react';
import type { ReactNode } from 'react';
import { X } from 'lucide-react';

export type Subject = { id: number; name: string; code: string };
export type Announcement = {
  id: number; title: string; content: string; priority: string; subjectId: number | null;
  subject: string | null; createdAt: string; publishAt: string | null;
};
export type ClassEvent = {
  id: number; title: string; description: string | null; eventType: string;
  startAt: string; endAt: string; location: string | null; subjectId: number | null; subject: string | null;
};

export function formatTime(value: string | Date) {
  return new Date(value).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}

export function localInput(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  const localTime = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localTime.toISOString().slice(0, 19);
}

export function fieldValue(data: FormData, name: string) {
  return String(data.get(name) ?? '');
}

export function subjectId(data: FormData) {
  const value = fieldValue(data, 'subjectId');
  return value ? Number(value) : null;
}

export function Field({ label, children, className = '' }: { label: string; children: ReactNode; className?: string }) {
  return <label className={'field ' + className}><span>{label}</span>{children}</label>;
}

export function SubjectSelect({ subjects, value }: { subjects: Subject[]; value?: number | null }) {
  return <Field label="Subject"><select name="subjectId" defaultValue={value ?? ''}>
    <option value="">General</option>
    {value != null && !subjects.some(subject => subject.id === value) && <option value={value}>Current subject</option>}
    {subjects.map(subject => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
  </select></Field>;
}

export function Heading({ icon, title, sub }: { icon: ReactNode; title: string; sub: string }) {
  return <div className="heading"><span>{icon}</span><div><h2>{title}</h2><p>{sub}</p></div></div>;
}

export function Dialog({ title, children, onClose, wide = false, busy = false }: {
  title: string; children: ReactNode; onClose: () => void; wide?: boolean; busy?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
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

export function saveDownload(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
