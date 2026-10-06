import { Fragment, createElement, type ReactNode } from 'react';
import en from '@/messages/en.json';

type Messages = Record<string, unknown>;

function lookup(messages: Messages, path: string): unknown {
  return path.split('.').reduce<unknown>((node, part) => (node as Messages | undefined)?.[part], messages);
}

/**
 * Minimal next-intl `useTranslations` stand-in backed by the real EN catalog,
 * for `vi.mock('next-intl', …)`: `t(key, values)`, `t.rich` (tags render
 * their chunks) and `t.raw`. Missing keys come back as the full key path so
 * a typo fails the assertion instead of rendering blank.
 */
export function makeTranslations(namespace?: string, messages: Messages = en as Messages) {
  const full = (key: string) => (namespace ? `${namespace}.${key}` : key);
  const t = (key: string, values?: Record<string, unknown>) => {
    const raw = lookup(messages, full(key));
    if (typeof raw !== 'string') return full(key);
    return raw.replace(/\{(\w+)\}/g, (_m, name: string) => String(values?.[name] ?? `{${name}}`));
  };
  t.raw = (key: string) => lookup(messages, full(key));
  t.rich = (key: string, tags: Record<string, (chunks: ReactNode) => ReactNode>) => {
    const raw = t(key);
    const parts: ReactNode[] = [];
    const re = /<(\w+)>(.*?)<\/\1>/g;
    let last = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(raw))) {
      parts.push(raw.slice(last, m.index));
      const render = tags[m[1]];
      parts.push(render ? render(m[2]) : m[2]);
      last = m.index + m[0].length;
    }
    parts.push(raw.slice(last));
    return parts.map((part, i) => createElement(Fragment, { key: i }, part));
  };
  return t;
}
