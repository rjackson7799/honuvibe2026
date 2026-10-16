import { fireEvent, render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { HomePathTabs, type HomePathTab } from '@/components/marketing/home/home-path-tabs';
import { stubMatchMedia } from '../hv/helpers';

const tabs: HomePathTab[] = [
  { key: 'learn', title: 'Learn AI skills', tags: ['5 tracks'] },
  { key: 'build', title: 'Build with Studio', tags: ['Website'] },
  { key: 'partner', title: 'Partner with us', tags: ['Your business'] },
];
const panels = { learn: <p>Learn panel</p>, build: <p>Build panel</p>, partner: <p>Partner panel</p> };

function renderTabs(defaultTab: 'learn' | 'build' | 'partner' = 'learn') {
  return render(
    <HomePathTabs
      defaultTab={defaultTab}
      intro={<h1>Intro</h1>}
      label="Three ways to work with us"
      tablistLabel="Ways to work with HonuVibe"
      tabs={tabs}
      panels={panels}
    />,
  );
}

const tab = (name: RegExp) => screen.getByRole('tab', { name });
const panelOf = (t: HTMLElement) => document.getElementById(t.getAttribute('aria-controls')!)!;

describe('HomePathTabs', () => {
  let animate: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    animate = vi.fn();
    Object.defineProperty(HTMLElement.prototype, 'animate', { configurable: true, writable: true, value: animate });
  });

  afterEach(() => {
    delete (HTMLElement.prototype as { animate?: unknown }).animate;
  });

  it('respects defaultTab and wires aria-selected / aria-controls / hidden / roving tabindex', () => {
    stubMatchMedia(false);
    renderTabs('build');
    expect(screen.getByRole('tablist', { name: 'Ways to work with HonuVibe' })).toBeInTheDocument();
    const build = tab(/Build with Studio/);
    expect(build).toHaveAttribute('aria-selected', 'true');
    expect(build).toHaveAttribute('tabindex', '0');
    expect(tab(/Learn AI skills/)).toHaveAttribute('aria-selected', 'false');
    expect(tab(/Learn AI skills/)).toHaveAttribute('tabindex', '-1');
    const panel = panelOf(build);
    expect(panel).toHaveAttribute('role', 'tabpanel');
    expect(panel).toHaveAttribute('aria-labelledby', build.id);
    expect(panel).not.toHaveAttribute('hidden');
    expect(panelOf(tab(/Learn AI skills/))).toHaveAttribute('hidden');
  });

  it('names each tab by its title and describes it by its tags', () => {
    stubMatchMedia(false);
    renderTabs();
    expect(screen.getByRole('tab', { name: 'Learn AI skills' })).toHaveAccessibleDescription('5 tracks');
  });

  it('keeps every panel in the DOM', () => {
    stubMatchMedia(false);
    renderTabs();
    expect(screen.getAllByRole('tabpanel', { hidden: true })).toHaveLength(3);
    expect(screen.getByText('Partner panel')).toBeInTheDocument();
  });

  it('click switches the panel and crossfades it', () => {
    stubMatchMedia(false);
    renderTabs();
    expect(animate).not.toHaveBeenCalled();
    fireEvent.click(tab(/Partner with us/));
    expect(tab(/Partner with us/)).toHaveAttribute('aria-selected', 'true');
    expect(panelOf(tab(/Partner with us/))).not.toHaveAttribute('hidden');
    expect(panelOf(tab(/Learn AI skills/))).toHaveAttribute('hidden');
    expect(animate).toHaveBeenCalledTimes(1);
    expect(animate.mock.calls[0][1]).toMatchObject({ duration: 380 });
  });

  it('arrow keys wrap, Home/End jump, and focus follows selection', () => {
    stubMatchMedia(false);
    renderTabs();
    const learn = tab(/Learn AI skills/);
    learn.focus();
    fireEvent.keyDown(learn, { key: 'ArrowRight' });
    expect(tab(/Build with Studio/)).toHaveAttribute('aria-selected', 'true');
    expect(document.activeElement).toBe(tab(/Build with Studio/));
    fireEvent.keyDown(document.activeElement!, { key: 'End' });
    expect(tab(/Partner with us/)).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(document.activeElement!, { key: 'ArrowRight' });
    expect(tab(/Learn AI skills/)).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(document.activeElement!, { key: 'ArrowLeft' });
    expect(tab(/Partner with us/)).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(document.activeElement!, { key: 'Home' });
    expect(tab(/Learn AI skills/)).toHaveAttribute('aria-selected', 'true');
    expect(document.activeElement).toBe(tab(/Learn AI skills/));
  });

  it('does not call animate() under reduced motion', () => {
    stubMatchMedia(true);
    renderTabs();
    fireEvent.click(tab(/Build with Studio/));
    fireEvent.click(tab(/Partner with us/));
    expect(tab(/Partner with us/)).toHaveAttribute('aria-selected', 'true');
    expect(animate).not.toHaveBeenCalled();
  });
});
