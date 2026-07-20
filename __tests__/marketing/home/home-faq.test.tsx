import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import en from '@/messages/en.json';
import { HomeFaq } from '@/components/marketing/home/home-faq';

const FAQ = en.home.faq as Record<string, string>;
const POLICY = en.billing_policy as Record<string, string>;

vi.mock('next-intl', () => ({
  useLocale: () => 'en',
  useTranslations: (ns: string) => {
    const base = ns === 'billing_policy' ? POLICY : FAQ;
    const t = (key: string) => base[key] ?? key;
    t.rich = (key: string) => (base[key] ?? key).replace(/<\/?[^>]+>/g, '');
    return t;
  },
}));

describe('HomeFaq', () => {
  it('opens the first item by default and exposes real aria-expanded state', () => {
    render(<HomeFaq />);
    const q1 = screen.getByRole('button', { name: FAQ.q_1 });
    const q2 = screen.getByRole('button', { name: FAQ.q_2 });
    expect(q1).toHaveAttribute('aria-expanded', 'true');
    expect(q2).toHaveAttribute('aria-expanded', 'false');
    expect(document.getElementById('home-faq-panel-0')?.hidden).toBe(false);
    expect(document.getElementById('home-faq-panel-1')?.hidden).toBe(true);
  });

  it('toggles an item closed and opens another (single-open accordion)', () => {
    render(<HomeFaq />);
    const q1 = screen.getByRole('button', { name: FAQ.q_1 });
    const q2 = screen.getByRole('button', { name: FAQ.q_2 });

    // close the default-open first item
    fireEvent.click(q1);
    expect(q1).toHaveAttribute('aria-expanded', 'false');
    expect(document.getElementById('home-faq-panel-0')?.hidden).toBe(true);

    // open the second item
    fireEvent.click(q2);
    expect(q2).toHaveAttribute('aria-expanded', 'true');
    expect(document.getElementById('home-faq-panel-1')?.hidden).toBe(false);
    expect(q1).toHaveAttribute('aria-expanded', 'false');
  });

  it('answers "can I cancel" from the shared billing_policy strings', () => {
    render(<HomeFaq />);
    fireEvent.click(screen.getByRole('button', { name: FAQ.q_5 }));
    const panel = document.getElementById('home-faq-panel-4');
    expect(panel?.textContent).toContain(POLICY.cancel);
    expect(panel?.textContent).toContain(POLICY.refund);
  });
});
