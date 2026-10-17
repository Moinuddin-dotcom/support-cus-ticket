const dateTime = new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' });

export function formatDateTime(iso: string): string {
  return dateTime.format(new Date(iso));
}

/** "in 3h 20m" / "2h 5m ago" relative to now. */
export function formatRelative(iso: string, now = Date.now()): string {
  const diff = new Date(iso).getTime() - now;
  const minutes = Math.round(Math.abs(diff) / 60_000);
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const mins = minutes % 60;
  const parts = days > 0 ? [`${days}d`, `${hours}h`] : hours > 0 ? [`${hours}h`, `${mins}m`] : [`${mins}m`];
  const text = parts.join(' ');
  return diff >= 0 ? `in ${text}` : `${text} ago`;
}

export function humanize(value: string): string {
  return value
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
