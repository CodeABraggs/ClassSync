import { Megaphone } from 'lucide-react';
import { Dialog, formatTime } from './classroomUi';
import type { Announcement } from './classroomUi';

function isScheduled(item: Announcement) {
  return item.publishAt != null && Date.parse(item.publishAt) > Date.now();
}

export function AnnouncementPreview({ item, onOpen }: { item: Announcement; onOpen: () => void }) {
  const time = item.publishAt ?? item.createdAt;
  const scheduled = isScheduled(item);

  return <button type="button" className="announcement-preview" aria-haspopup="dialog"
    aria-label={'View announcement: ' + item.title} onClick={onOpen}>
    <span className={item.priority === 'IMPORTANT' ? 'feed-icon urgent' : 'feed-icon'}><Megaphone aria-hidden="true" /></span>
    <span className="announcement-copy">
      <span className="announcement-title">
        <strong>{item.title}</strong>
        {item.priority === 'IMPORTANT' && <span className="badge red">Important</span>}
        {scheduled && <span className="badge violet">Scheduled</span>}
      </span>
      <span className="announcement-excerpt">{item.content}</span>
      <span className="announcement-meta">{item.subject ?? 'General'} · {scheduled ? 'Publishes ' : ''}<time dateTime={time}>{formatTime(time)}</time></span>
    </span>
  </button>;
}

export function AnnouncementDialog({ item, onClose }: { item: Announcement; onClose: () => void }) {
  const time = item.publishAt ?? item.createdAt;
  const scheduled = isScheduled(item);

  return <Dialog title={item.title} onClose={onClose}>
    <div className="announcement-details">
      <div className="edit-actions">
        <span className="badge">{item.subject ?? 'General'}</span>
        {item.priority === 'IMPORTANT' && <span className="badge red">Important</span>}
        {scheduled && <span className="badge violet">Scheduled</span>}
      </div>
      <p className="announcement-meta">{scheduled ? 'Publishes ' : 'Published '}<time dateTime={time}>{formatTime(time)}</time></p>
      <p className="announcement-body">{item.content}</p>
    </div>
  </Dialog>;
}
