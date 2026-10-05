import { render } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { HvReveal } from '@/components/marketing/hv/motion/reveal';
import { stubMatchMedia } from './helpers';

vi.mock('next/navigation', () => ({ usePathname: () => '/' }));

type IOCallback = (entries: Array<{ isIntersecting: boolean; target: Element }>) => void;

function stubIntersectionObserver() {
  const observe = vi.fn();
  const unobserve = vi.fn();
  const disconnect = vi.fn();
  let callback: IOCallback = () => {};
  class IO {
    constructor(cb: IOCallback) {
      callback = cb;
    }
    observe = observe;
    unobserve = unobserve;
    disconnect = disconnect;
  }
  vi.stubGlobal('IntersectionObserver', IO);
  return { observe, unobserve, disconnect, fire: (el: Element) => callback([{ isIntersecting: true, target: el }]) };
}

function mountPage() {
  document.body.innerHTML = `
    <div data-shell="hv">
      <h1 data-intro>Hero</h1>
      <p data-intro>Lead</p>
      <section data-reveal data-reveal-delay="120"><span data-line></span>Below</section>
    </div>`;
}

type AnimateArgs = [Keyframe[] | PropertyIndexedKeyframes | null, (number | KeyframeAnimationOptions)?];
const opts = (call: AnimateArgs) => call[1] as KeyframeAnimationOptions;

describe('HvReveal', () => {
  const animate = vi.fn((..._args: AnimateArgs) => ({ cancel() {} }) as unknown as Animation);

  beforeEach(() => {
    mountPage();
    (HTMLElement.prototype as unknown as { animate: typeof animate }).animate = animate;
    animate.mockClear();
    // Everything measures as below the fold in jsdom (rect top 0, innerHeight 768) —
    // push the reveal section down so it is observed rather than skipped.
    const section = document.querySelector('[data-reveal]') as HTMLElement;
    section.getBoundingClientRect = () => ({ top: 2000 }) as DOMRect;
  });

  afterEach(() => {
    document.body.innerHTML = '';
    vi.unstubAllGlobals();
  });

  it('staggers the intro elements and observes reveal elements', () => {
    stubMatchMedia(false);
    const io = stubIntersectionObserver();
    render(<HvReveal />);

    // Two [data-intro] elements animated with the 80ms + 90ms stagger.
    const introCalls = animate.mock.calls.filter((c) => opts(c).duration === 750);
    expect(introCalls).toHaveLength(2);
    expect(opts(introCalls[0]).delay).toBe(80);
    expect(opts(introCalls[1]).delay).toBe(170);

    const section = document.querySelector('[data-reveal]') as HTMLElement;
    expect(io.observe).toHaveBeenCalledWith(section);

    io.fire(section);
    const revealCall = animate.mock.calls.find((c) => opts(c).duration === 800);
    expect(revealCall).toBeTruthy();
    expect(opts(revealCall!).delay).toBe(120);
    const lineCall = animate.mock.calls.find((c) => opts(c).duration === 1000);
    expect(opts(lineCall!).delay).toBe(270);
    expect(section.dataset.played).toBe('1');
    expect(io.unobserve).toHaveBeenCalledWith(section);
  });

  it('does nothing under reduced motion', () => {
    stubMatchMedia(true);
    const io = stubIntersectionObserver();
    render(<HvReveal />);
    expect(animate).not.toHaveBeenCalled();
    expect(io.observe).not.toHaveBeenCalled();
  });

  it('honours the animateHero / scrollReveal flags', () => {
    stubMatchMedia(false);
    const io = stubIntersectionObserver();
    render(<HvReveal animateHero={false} scrollReveal={false} />);
    expect(animate).not.toHaveBeenCalled();
    expect(io.observe).not.toHaveBeenCalled();
  });

  it('never replays an element twice', () => {
    stubMatchMedia(false);
    const io = stubIntersectionObserver();
    render(<HvReveal />);
    const section = document.querySelector('[data-reveal]') as HTMLElement;
    io.fire(section);
    const before = animate.mock.calls.length;
    io.fire(section);
    expect(animate.mock.calls.length).toBe(before);
  });
});
