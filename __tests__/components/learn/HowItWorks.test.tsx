import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { HowItWorks } from '@/components/learn/HowItWorks';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, vars?: Record<string, unknown>) =>
    vars ? `${key}:${JSON.stringify(vars)}` : key,
}));

describe('HowItWorks', () => {
  it('renders the live variant by default', () => {
    render(<HowItWorks communityMonths={3} />);
    expect(screen.getByText('how_step_1')).toBeInTheDocument();
    expect(screen.getByText('how_step_2')).toBeInTheDocument();
    expect(screen.getByText('how_step_3')).toBeInTheDocument();
    expect(screen.getByText('how_step_4:{"months":3}')).toBeInTheDocument();
  });

  it('renders the live variant when isRecordedOnly is false', () => {
    render(<HowItWorks communityMonths={3} isRecordedOnly={false} />);
    expect(screen.getByText('how_step_1')).toBeInTheDocument();
    expect(screen.getByText('how_step_2')).toBeInTheDocument();
  });

  it('swaps steps 1 and 2 copy when isRecordedOnly is true', () => {
    render(<HowItWorks communityMonths={3} isRecordedOnly={true} />);
    expect(screen.getByText('how_step_1_recorded')).toBeInTheDocument();
    expect(screen.getByText('how_step_2_recorded')).toBeInTheDocument();
    expect(screen.queryByText('how_step_1')).not.toBeInTheDocument();
    expect(screen.queryByText('how_step_2')).not.toBeInTheDocument();
  });

  it('keeps steps 3 and 4 unchanged in recorded-only variant', () => {
    render(<HowItWorks communityMonths={3} isRecordedOnly={true} />);
    expect(screen.getByText('how_step_3')).toBeInTheDocument();
    expect(screen.getByText('how_step_4:{"months":3}')).toBeInTheDocument();
  });
});
