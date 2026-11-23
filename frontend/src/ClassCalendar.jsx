import { useEffect, useRef, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { Clock3, Download, MapPin, Pencil, Plus, Trash2 } from 'lucide-react';
import { errorMessage } from './api';
import { Dialog, Field, SubjectSelect, fieldValue, formatTime, localInput, saveDownload, subjectId } from './classroomUi';

const types = [
  { value: 'EXAM', label: 'Exam', tone: 'violet' },
  { value: 'ASSIGNMENT', label: 'Assignment', tone: 'blue' },
  { value: 'DEADLINE', label: 'Deadline', tone: 'amber' },
  { value: 'HOLIDAY', label: 'Holiday', tone: 'green' },
  { value: 'OTHER', label: 'Other', tone: 'slate' },
];

export function EventBadge({ type }) {
  const value = types.find(item => item.value === type) ?? types[4];
  return <span className={'badge ' + value.tone}>{value.label}</span>;
}

function dayTitle(date) {
  return date.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

export function EventDetails({ event }) {
  return <div className="event-details">
    <EventBadge type={event.eventType} />
    {event.subject && <span className="badge">{event.subject}</span>}
    <dl>
      <dt>Starts</dt><dd>{formatTime(event.startAt)}</dd>
      <dt>Ends</dt><dd>{formatTime(event.endAt)}</dd>
      {event.location && <><dt>Location</dt><dd>{event.location}</dd></>}
    </dl>
    {event.description && <p>{event.description}</p>}
  </div>;
}

export default function ClassCalendar({ api, canEdit, note }) {
  const [events, setEvents] = useState();
  const [subjects, setSubjects] = useState([]);
  const [form, setForm] = useState();
  const [formError, setFormError] = useState('');
  const [selectedDay, setSelectedDay] = useState();
  const [detailId, setDetailId] = useState();
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [revision, refresh] = useState(0);
  const formRef = useRef(null);
  const detail = events?.find(event => event.id === detailId);
  const detailsTitle = form?.day ? 'Add event for ' + dayTitle(form.day)
    : form?.event ? 'Edit calendar event'
    : form ? 'Add event' : detail?.title ?? (selectedDay ? dayTitle(selectedDay) : '');
  const dayStart = selectedDay && new Date(selectedDay.getFullYear(), selectedDay.getMonth(), selectedDay.getDate()).getTime();
  const dayEnd = selectedDay && new Date(selectedDay.getFullYear(), selectedDay.getMonth(), selectedDay.getDate() + 1).getTime();
  const dayEvents = dayStart !== undefined && dayEnd !== undefined
    ? events?.filter(event => Date.parse(event.startAt) < dayEnd && Date.parse(event.endAt) > dayStart) ?? [] : [];

  useEffect(() => {
    const controller = new AbortController();
    api.get('/events', { signal: controller.signal })
      .then(({ data }) => { setEvents(data); setLoadError(''); })
      .catch(error => { if (!controller.signal.aborted) setLoadError(errorMessage(error)); });
    return () => controller.abort();
  }, [api, revision]);

  useEffect(() => {
    if (canEdit) api.get('/subjects').then(({ data }) => setSubjects(data)).catch(error => note(errorMessage(error)));
  }, [api, canEdit, note]);

  useEffect(() => {
    if (form) formRef.current?.querySelector('input')?.focus();
  }, [form]);

  function openForm(next) {
    setFormError('');
    setForm(next);
  }

  async function save(event) {
    event.preventDefault();
    if (!form || busy) return;
    const data = new FormData(event.currentTarget);
    const startAt = new Date(fieldValue(data, 'startAt'));
    const endAt = new Date(fieldValue(data, 'endAt'));
    if (!Number.isFinite(startAt.getTime()) || !Number.isFinite(endAt.getTime()) || endAt <= startAt) {
      setFormError('Choose a valid start and end time. The end time must be after the start time.');
      return;
    }
    const input = {
      title: fieldValue(data, 'title'), description: fieldValue(data, 'description'), eventType: fieldValue(data, 'eventType'),
      startAt: startAt.toISOString(), endAt: endAt.toISOString(), location: fieldValue(data, 'location'), subjectId: subjectId(data),
    };
    setBusy(true);
    setFormError('');
    try {
      const { data: saved } = form.event
        ? await api.put('/events/' + form.event.id, input)
        : await api.post('/events', input);
      setEvents(current => [...(current ?? []).filter(item => item.id !== saved.id), saved]
        .sort((a, b) => Date.parse(a.startAt) - Date.parse(b.startAt)));
      note(form.event ? 'Event updated.' : 'Event added.');
      setForm(undefined);
      refresh(value => value + 1);
    } catch (error) {
      setFormError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function remove(event) {
    if (!window.confirm('Delete “' + event.title + '”?')) return;
    setBusy(true);
    try {
      await api.delete('/events/' + event.id);
      if (form?.event?.id === event.id) setForm(undefined);
      if (detailId === event.id) setDetailId(undefined);
      refresh(value => value + 1);
      note('Event deleted.');
    } catch (error) {
      note(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function download(event) {
    try {
      const { data } = await api.get('/events/' + event.id + '/ics', { responseType: 'blob' });
      saveDownload(data, 'event-' + event.id + '.ics');
    } catch (error) {
      note(errorMessage(error));
    }
  }

  function openDay(date) { setDetailId(undefined); setSelectedDay(date); }
  function openEvent(id) { setSelectedDay(undefined); setDetailId(id); }
  function closeDetails() {
    setDetailId(undefined);
    setSelectedDay(undefined);
    setForm(undefined);
  }

  function initialTime(hour, value) {
    if (value || !form?.day) return localInput(value);
    const day = new Date(form.day);
    day.setHours(hour, 0, 0, 0);
    return localInput(day.toISOString());
  }

  const eventForm = form && <form ref={formRef} key={form.event?.id ?? 'new'} className="form-grid" onSubmit={save}>
    <Field label="Title"><input name="title" defaultValue={form.event?.title} maxLength={180} required /></Field>
    <Field label="Type"><select name="eventType" defaultValue={form.event?.eventType ?? 'EXAM'}>
      {types.map(type => <option key={type.value} value={type.value}>{type.label}</option>)}
    </select></Field>
    <Field label="Starts"><input name="startAt" type="datetime-local" step="1" defaultValue={initialTime(9, form.event?.startAt)} required /></Field>
    <Field label="Ends"><input name="endAt" type="datetime-local" step="1" defaultValue={initialTime(10, form.event?.endAt)} required /></Field>
    <SubjectSelect subjects={subjects} value={form.event?.subjectId} />
    <Field label="Location"><input name="location" maxLength={180} defaultValue={form.event?.location ?? ''} /></Field>
    <Field label="Description" className="wide"><textarea name="description" defaultValue={form.event?.description ?? ''} /></Field>
    {formError && <p className="form-hint wide" role="alert">{formError}</p>}
    <div className="edit-actions wide">
      <button className="primary" disabled={busy}>{form.event ? 'Save changes' : 'Save event'}</button>
      <button type="button" className="secondary" disabled={busy} onClick={() => setForm(undefined)}>
        {form.day ? 'Back to day' : detail ? 'Back to event' : 'Cancel'}
      </button>
    </div>
  </form>;

  return <div className="stack">
    <div className="toolbar">
      <p className="form-hint">Choose a day to see its events.</p>
      {canEdit && <button className="primary" aria-haspopup="dialog" disabled={busy} onClick={() => openForm({})}><Plus />Add event</button>}
    </div>
    {loadError && <section className="panel" role="alert">{loadError} <button className="secondary" onClick={() => refresh(value => value + 1)}>Retry</button></section>}
    <section className="panel calendar">
      <FullCalendar plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]} initialView="dayGridMonth" timeZone="local"
        headerToolbar={{ left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek' }}
        buttonText={{ today: 'Today', month: 'Month', week: 'Week' }} height="auto" dayMaxEvents={3}
        dateClick={({ date }) => openDay(date)}
        eventClick={({ event }) => openEvent(Number(event.id))}
        dayCellContent={({ date, dayNumberText, view }) => view.type === 'dayGridMonth'
          ? <button type="button" className="calendar-day" aria-label={'View events for ' + dayTitle(date)}
              onClick={event => { event.stopPropagation(); openDay(date); }}>{dayNumberText}</button>
          : dayNumberText}
        dayHeaderContent={({ date, text, view }) => view.type === 'timeGridWeek'
          ? <button type="button" className="calendar-day" aria-label={'View events for ' + dayTitle(date)}
              onClick={event => { event.stopPropagation(); openDay(date); }}>{text}</button>
          : text}
        events={events?.map(event => ({
          id: String(event.id), title: event.title, start: event.startAt, end: event.endAt,
          className: 'event-' + event.eventType.toLowerCase(), interactive: true,
        })) ?? []} />
    </section>
    <section className="panel">
      <div className="panel-head"><div><h2>Scheduled events</h2><p>{events ? `${events.length} events` : 'Loading events…'}</p></div></div>
      <div className="event-list">{events?.map(event => <article key={event.id}>
        <div className="mini-date"><b>{new Date(event.startAt).getDate()}</b>
          <span>{new Date(event.startAt).toLocaleString('en', { month: 'short' }).toUpperCase()}</span></div>
        <div className="event-info">
          <h3><EventBadge type={event.eventType} /><button className="event-title-button" onClick={() => openEvent(event.id)}>{event.title}</button></h3>
          <p><Clock3 />{formatTime(event.startAt)}{event.subject && ' · ' + event.subject}</p>
          {event.location && <p><MapPin />{event.location}</p>}
        </div>
        <div className="actions edit-actions">
          <button onClick={() => download(event)} aria-label={'Download calendar entry for ' + event.title}><Download />Calendar</button>
          {canEdit && <>
            <button className="icon-btn" disabled={busy} aria-label={'Edit ' + event.title} onClick={() => openForm({ event })}><Pencil /></button>
            <button className="danger icon-btn" disabled={busy} aria-label={'Delete ' + event.title} onClick={() => remove(event)}><Trash2 /></button>
          </>}
        </div>
      </article>)}</div>
      {events?.length === 0 && <p className="library-empty">No events scheduled.</p>}
    </section>
    {(form || selectedDay || detail) && <Dialog title={detailsTitle} onClose={closeDetails} busy={busy} wide={!!form}>
      {form ? eventForm : detail ? <>
        <EventDetails event={detail} />
        <div className="edit-actions">
          {selectedDay && <button className="secondary" onClick={() => setDetailId(undefined)}>Back to day</button>}
          <button className="secondary" onClick={() => download(detail)}><Download />Download calendar entry</button>
          {canEdit && <button className="primary" onClick={() => openForm({ event: detail })}><Pencil />Edit event</button>}
        </div>
      </> : <div className="day-events">
        {dayEvents.map(event => <button key={event.id} onClick={() => setDetailId(event.id)}>
          <EventBadge type={event.eventType} /><strong>{event.title}</strong><small>{formatTime(event.startAt)}</small>
        </button>)}
        {!dayEvents.length && <p>{events ? 'No events scheduled for this day.' : 'Event data is unavailable.'}</p>}
        {canEdit && selectedDay && <div className="edit-actions">
          <button className="primary" disabled={busy} onClick={() => openForm({ day: selectedDay })}><Plus />Add event</button>
        </div>}
      </div>}
    </Dialog>}
  </div>;
}
