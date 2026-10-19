// keepsakes/time.js. Event times are stored as wall-clock date + time + IANA zone (what the host
// typed, where the party is). Everything a guest sees is derived from that, so the countdown and
// the calendar file are right wherever the guest is. Pure; safe in the browser and on the server.

function offsetMinutes(instant, tz) {
  const f = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const p = Object.fromEntries(f.formatToParts(instant).map((x) => [x.type, x.value]));
  const asUTC = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  return (asUTC - instant.getTime()) / 60000;
}

export function eventInstant(date, time, tz) {
  if (!date) return null;
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = (time || '14:00').split(':').map(Number);
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  let t = guess - offsetMinutes(new Date(guess), tz) * 60000;
  t = guess - offsetMinutes(new Date(t), tz) * 60000; // second pass settles DST edges
  return new Date(t);
}

export function validTz(tz) {
  try { new Intl.DateTimeFormat('en', { timeZone: tz }); return true; } catch { return false; }
}

export function niceDate(date, time, tz) {
  const i = eventInstant(date, time, tz);
  if (!i || isNaN(i)) return '';
  return i.toLocaleDateString('en-AU', { timeZone: tz, weekday: 'long', day: 'numeric', month: 'long' });
}

export function niceTime(date, time, tz) {
  const i = eventInstant(date, time, tz);
  if (!i || isNaN(i)) return '';
  return i.toLocaleTimeString('en-AU', { timeZone: tz, hour: 'numeric', minute: '2-digit' }).replace(':00', '').replace(/\s/g, '').toLowerCase();
}

const stamp = (d) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
const icsEsc = (s) => String(s || '').replace(/\\/g, '\\\\').replace(/[,;]/g, '\\$&').replace(/\n/g, '\\n');

export function icsFor(ev, url) {
  const s = eventInstant(ev.date, ev.time, ev.tz);
  const e = new Date(s.getTime() + 3 * 3600e3);
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Little Poppin//Invitation//EN', 'CALSCALE:GREGORIAN', 'BEGIN:VEVENT',
    `UID:${ev.slug || 'preview'}@littlepoppin.com`, `DTSTAMP:${stamp(new Date())}`, `DTSTART:${stamp(s)}`, `DTEND:${stamp(e)}`,
    `SUMMARY:${icsEsc(ev.title)}`, `LOCATION:${icsEsc([ev.venue, ev.address].filter(Boolean).join(', '))}`,
    `DESCRIPTION:${icsEsc([ev.lede, url].filter(Boolean).join('\n'))}`, url ? `URL:${url}` : null,
    'END:VEVENT', 'END:VCALENDAR',
  ].filter(Boolean).join('\r\n');
}

export function googleCalUrl(ev, url) {
  const s = eventInstant(ev.date, ev.time, ev.tz), e = new Date(s.getTime() + 3 * 3600e3);
  const q = new URLSearchParams({
    action: 'TEMPLATE', text: ev.title, dates: `${stamp(s)}/${stamp(e)}`,
    details: [ev.lede, url].filter(Boolean).join('\n'), location: [ev.venue, ev.address].filter(Boolean).join(', '),
  });
  return `https://calendar.google.com/calendar/render?${q}`;
}

export function mapUrl(venue, address) {
  const q = [venue, address].filter(Boolean).join(', ');
  return q ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}` : null;
}
