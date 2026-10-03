import config from "#config";

const tz = config.venue.timezone;

const dayFormat = new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "short", month: "short", day: "numeric" });
const longDayFormat = new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "long", month: "long", day: "numeric" });
const timeFormat = new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", minute: "2-digit" });
const keyFormat = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" });

export function money(cents: number): string {
  let dollars = cents / 100;

  return Number.isInteger(dollars) ? `$${dollars.toLocaleString("en-US")}` : `$${dollars.toFixed(2)}`;
}

export function day(d: Date): string {
  return dayFormat.format(d);
}

export function longDay(d: Date): string {
  return longDayFormat.format(d);
}

export function time(d: Date): string {
  return timeFormat.format(d).replace(":00", "").replace(" ", "").toLowerCase();
}

/** "Tonight" when the date falls on today in the venue's time zone. */
export function when(d: Date): string {
  return keyFormat.format(d) === keyFormat.format(new Date()) ? "Tonight" : day(d);
}

export function isToday(d: Date): boolean {
  return keyFormat.format(d) === keyFormat.format(new Date());
}

/** The venue-local date and time as the values of date and time inputs. */
export function dateInput(d: Date): string {
  return keyFormat.format(d);
}

export function plural(n: number, one: string, many: string = `${one}s`): string {
  return `${n.toLocaleString("en-US")} ${n === 1 ? one : many}`;
}
