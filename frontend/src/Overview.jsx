import { useEffect, useState } from 'react';
import { CalendarDays, ChevronRight, FileText, Megaphone } from 'lucide-react';
import { errorMessage } from './api';
import { Dialog, formatTime } from './classroomUi';
import { EventBadge, EventDetails } from './ClassCalendar';
import { AnnouncementDialog, AnnouncementPreview } from './AnnouncementPreview';


export default function Overview({ api, go }) {
  const [summary, setSummary] = useState();
  const [error, setError] = useState('');
  const [revision, refresh] = useState(0);
  const [event, setEvent] = useState();
  const [announcementId, setAnnouncementId] = useState();
  const openAnnouncement = summary?.announcements.find(item => item.id === announcementId);

  useEffect(() => {
    const controller = new AbortController();
    const options = { signal: controller.signal };
    async function load() {
      try {
        const [announcements, events, files] = await Promise.all([
          api.get('/announcements', options),
          api.get('/events', options),
          api.get('/resources', options),
        ]);
        if (controller.signal.aborted) return;
        setSummary({ announcements: announcements.data, events: events.data, files: files.data });
        setError('');
      } catch (error) {
        if (!controller.signal.aborted) setError(errorMessage(error));
      }
    }
    load();
    const timer = window.setInterval(load, 30_000);
    return () => { controller.abort(); window.clearInterval(timer); };
  }, [api, revision]);

  const upcoming = summary?.events.filter(event => Date.parse(event.endAt) > Date.now()) ?? [];
  const cards = [
    { tab: 'announcements', label: 'Announcements', count: summary?.announcements.length, icon: Megaphone, tone: 'violet' },
    { tab: 'calendar', label: 'Upcoming events', count: summary ? upcoming.length : undefined, icon: CalendarDays, tone: 'blue' },
    { tab: 'resources', label: 'Study resources', count: summary?.files.length, icon: FileText, tone: 'green' },
  ];

  return <div className="stack">
    <div className="stats overview-stats">{cards.map(({ icon: Icon, ...card }) => <article key={card.tab}>
      <button className="overview-stat" onClick={() => go(card.tab)}>
        <span className={card.tone}><Icon /></span><span><b>{card.count ?? '–'}</b><small>{card.label}</small></span><ChevronRight />
      </button>
    </article>)}</div>
    {error && <section className="panel" role="alert">{error} <button className="secondary" onClick={() => refresh(value => value + 1)}>Retry</button></section>}
    {!summary && !error && <section className="panel" role="status">Loading the classroom overview…</section>}
    {summary && <div className="dash-grid">
      <section className="panel">
        <div className="panel-head"><div><h2>Latest announcements</h2></div><button onClick={() => go('announcements')}>View all</button></div>
        <div className="feed">{summary.announcements.slice(0, 4).map(item => <article key={item.id}>
          <AnnouncementPreview item={item} onOpen={() => setAnnouncementId(item.id)} />
        </article>)}</div>
        {!summary.announcements.length && <p className="library-empty">No announcements have been published yet.</p>}
      </section>
      <section className="panel">
        <div className="panel-head"><div><h2>Upcoming events</h2></div><button onClick={() => go('calendar')}>Open calendar</button></div>
        <div className="day-events">{upcoming.slice(0, 4).map(item => <button key={item.id} onClick={() => setEvent(item)}>
          <EventBadge type={item.eventType} /><strong>{item.title}</strong><small>{formatTime(item.startAt)}</small>
        </button>)}</div>
        {!upcoming.length && <p className="library-empty">No upcoming events.</p>}
      </section>
      <section className="panel overview-files">
        <div className="panel-head"><div><h2>Recently added files</h2></div><button onClick={() => go('resources')}>Open resources</button></div>
        <div className="feed">{summary.files.slice(0, 4).map(file => <article key={file.id}>
          <span className="feed-icon"><FileText /></span><div><h3>{file.name}</h3><small>{file.subject} · {formatTime(file.uploadedAt)}</small></div>
        </article>)}</div>
        {!summary.files.length && <p className="library-empty">No study files have been uploaded yet.</p>}
      </section>
    </div>}
    {event && <Dialog title={event.title} onClose={() => setEvent(undefined)}><EventDetails event={event} /></Dialog>}
    {openAnnouncement && <AnnouncementDialog item={openAnnouncement} onClose={() => setAnnouncementId(undefined)} />}
  </div>;
}
