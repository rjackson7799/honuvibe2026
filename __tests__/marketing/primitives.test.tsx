import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import {
  Badge,
  BrowserFrame,
  Button,
  Card,
  Container,
  DisplayHeading,
  NumberedStep,
  Overline,
  PhotoPlaceholder,
  Section,
  SectionHeading,
} from '@/components/marketing/primitives';

describe('Container', () => {
  it('caps width at 1200 and centers', () => {
    const { container } = render(<Container>x</Container>);
    const root = container.firstElementChild as HTMLElement;
    expect(root.className).toContain('max-w-[1200px]');
    expect(root.className).toContain('mx-auto');
  });
});

describe('Section', () => {
  it('defaults to canvas variant + default spacing', () => {
    const { container } = render(<Section>x</Section>);
    const root = container.firstElementChild as HTMLElement;
    expect(root.className).toContain('bg-[var(--m-canvas)]');
    expect(root.className).toContain('py-16');
    expect(root.className).toContain('md:py-24');
  });

  it('applies the sand variant', () => {
    const { container } = render(<Section variant="sand">x</Section>);
    const root = container.firstElementChild as HTMLElement;
    expect(root.className).toContain('bg-[var(--m-sand)]');
  });

  it('hero spacing uses 88px top padding only', () => {
    const { container } = render(<Section spacing="hero">x</Section>);
    const root = container.firstElementChild as HTMLElement;
    expect(root.className).toContain('pt-[88px]');
    // hero must NOT carry the default symmetric py
    expect(root.className).not.toContain('py-16');
  });
});

describe('Overline', () => {
  it('renders as paragraph with uppercase + bold tracking', () => {
    render(<Overline>kicker</Overline>);
    const el = screen.getByText('kicker');
    expect(el.tagName).toBe('P');
    expect(el.className).toContain('uppercase');
    expect(el.className).toContain('tracking-[0.09em]');
  });

  it('teal tone uses --m-accent-teal', () => {
    render(<Overline tone="teal">kicker</Overline>);
    expect(screen.getByText('kicker').className).toContain('text-[var(--m-accent-teal)]');
  });

  it('coral tone uses --m-accent-coral', () => {
    render(<Overline tone="coral">kicker</Overline>);
    expect(screen.getByText('kicker').className).toContain('text-[var(--m-accent-coral)]');
  });
});

describe('DisplayHeading', () => {
  it('renders as h1 by default at default size', () => {
    render(<DisplayHeading>Hero</DisplayHeading>);
    const el = screen.getByRole('heading', { level: 1 });
    expect(el).toBeInTheDocument();
    expect(el.className).toContain('text-[var(--m-text-h1)]');
  });

  it('xl size uses display-xl scale', () => {
    render(<DisplayHeading size="xl">Big</DisplayHeading>);
    const el = screen.getByRole('heading', { level: 1 });
    expect(el.className).toContain('text-[var(--m-text-display-xl)]');
  });
});

describe('SectionHeading', () => {
  it('renders as h2 at h2 scale by default', () => {
    render(<SectionHeading>Section</SectionHeading>);
    const el = screen.getByRole('heading', { level: 2 });
    expect(el.className).toContain('text-[var(--m-text-h2)]');
  });

  it('h3 size renders smaller scale and respects "as" prop', () => {
    render(
      <SectionHeading size="h3" as="h3">
        Sub
      </SectionHeading>,
    );
    const el = screen.getByRole('heading', { level: 3 });
    expect(el.className).toContain('text-[var(--m-text-h3)]');
  });
});

describe('Button', () => {
  it('renders a <button> by default with primary-teal styling', () => {
    render(<Button>Click</Button>);
    const btn = screen.getByRole('button', { name: 'Click' });
    expect(btn.className).toContain('bg-[var(--m-accent-teal)]');
  });

  it('renders an <a> when href is provided', () => {
    render(<Button href="/learn">Go</Button>);
    const link = screen.getByRole('link', { name: /go/i });
    expect(link.tagName).toBe('A');
    expect(link.getAttribute('href')).toBe('/learn');
  });

  it('coral variant uses coral background', () => {
    render(<Button variant="primary-coral">x</Button>);
    expect(screen.getByRole('button').className).toContain('bg-[var(--m-accent-coral)]');
  });

  it('outline-teal variant has teal border, transparent bg', () => {
    render(<Button variant="outline-teal">x</Button>);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('border-[var(--m-accent-teal)]');
    expect(btn.className).toContain('bg-transparent');
  });

  it('renders an arrow when withArrow is set', () => {
    const { container } = render(<Button withArrow>Go</Button>);
    // lucide ArrowRight renders an <svg>
    expect(container.querySelector('svg')).not.toBeNull();
  });

  it('does not render an arrow when withArrow is omitted', () => {
    const { container } = render(<Button>Plain</Button>);
    expect(container.querySelector('svg')).toBeNull();
  });

  it('forwards onClick to the underlying button', () => {
    let clicked = 0;
    render(<Button onClick={() => (clicked += 1)}>Hit</Button>);
    screen.getByRole('button').click();
    expect(clicked).toBe(1);
  });
});

describe('Card', () => {
  it('default variant uses white surface', () => {
    const { container } = render(<Card>x</Card>);
    const root = container.firstElementChild as HTMLElement;
    expect(root.className).toContain('bg-[var(--m-white)]');
  });

  it('navy variant uses ink-primary background and white ink', () => {
    const { container } = render(<Card variant="navy">x</Card>);
    const root = container.firstElementChild as HTMLElement;
    expect(root.className).toContain('bg-[var(--m-ink-primary)]');
    expect(root.className).toContain('text-white');
  });

  it('interactive cards opt in to the hover lift class string', () => {
    const { container } = render(<Card interactive>x</Card>);
    const root = container.firstElementChild as HTMLElement;
    expect(root.className).toContain('hover:-translate-y-1');
    expect(root.className).toContain('hover:border-[var(--m-border-teal)]');
  });

  it('non-interactive cards do not include the hover lift', () => {
    const { container } = render(<Card>x</Card>);
    const root = container.firstElementChild as HTMLElement;
    expect(root.className).not.toContain('hover:-translate-y-1');
  });
});

describe('Badge', () => {
  it.each([
    ['info', 'bg-[var(--m-accent-coral-soft)]'],
    ['status', 'bg-[var(--m-accent-teal)]'],
    ['active', 'bg-[var(--m-accent-teal-soft)]'],
    ['by-application', 'bg-[var(--m-ink-primary)]'],
    ['coming-soon', 'bg-[var(--m-accent-coral)]'],
  ] as const)('%s tone applies %s', (tone, expectedClass) => {
    render(<Badge tone={tone}>label</Badge>);
    expect(screen.getByText('label').className).toContain(expectedClass);
  });
});

describe('BrowserFrame', () => {
  it('renders the URL chip and the children', () => {
    render(
      <BrowserFrame url="vault.honovibe.ai">
        <span>body</span>
      </BrowserFrame>,
    );
    expect(screen.getByText('body')).toBeInTheDocument();
    expect(screen.getByText('vault.honovibe.ai')).toBeInTheDocument();
  });

  it('omits the lock glyph when secure=false', () => {
    render(
      <BrowserFrame url="x" secure={false}>
        <span>body</span>
      </BrowserFrame>,
    );
    expect(screen.queryByText('🔒')).toBeNull();
  });
});

describe('PhotoPlaceholder', () => {
  it('renders the gradient variant with the provided label', () => {
    render(<PhotoPlaceholder label="ryan jackson — founder photo" />);
    expect(screen.getByText('ryan jackson — founder photo')).toBeInTheDocument();
  });

  it('renders the dashed Explore-style variant when variant="dashed"', () => {
    const { container } = render(
      <PhotoPlaceholder variant="dashed" label="Community Project" />,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root.className).toContain('border-dashed');
  });
});

describe('NumberedStep', () => {
  it('renders the index, title, and body', () => {
    render(<NumberedStep index="1" title="Discovery" body="We learn about your community." />);
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('Discovery')).toBeInTheDocument();
    expect(screen.getByText('We learn about your community.')).toBeInTheDocument();
  });

  it('renders the inline layout when requested', () => {
    const { container } = render(
      <NumberedStep index="2" title="Apply" body="Build it." layout="inline" />,
    );
    const root = container.firstElementChild as HTMLElement;
    // inline layout uses flex-row item alignment
    expect(root.className).toContain('flex');
    expect(root.className).toContain('items-start');
  });
});
