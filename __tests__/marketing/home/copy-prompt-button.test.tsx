import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import en from '@/messages/en.json';
import { CopyPromptButton } from '@/components/marketing/home/copy-prompt-button';

const T = en.home.membership.teaser;

vi.mock('next-intl', () => ({
  useTranslations: () => {
    const base = T as Record<string, string>;
    return (key: string) => base[key] ?? key;
  },
}));

function setClipboard(writeText?: (text: string) => Promise<void>) {
  Object.defineProperty(navigator, 'clipboard', {
    value: writeText ? { writeText } : undefined,
    configurable: true,
  });
}

describe('CopyPromptButton', () => {
  beforeEach(() => {
    window.plausible = vi.fn();
  });

  afterEach(() => {
    setClipboard(undefined);
    vi.restoreAllMocks();
    delete window.plausible;
  });

  it('copies, shows the copied status, and fires prompt_copy on success', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    setClipboard(writeText);

    render(<CopyPromptButton prompt="THE PROMPT" locale="en" />);

    const button = await screen.findByRole('button', { name: T.copy_label });
    fireEvent.click(button);

    await screen.findByText(T.copied_label);
    expect(writeText).toHaveBeenCalledWith('THE PROMPT');
    expect(window.plausible).toHaveBeenCalledWith('prompt_copy', {
      props: { source: 'home_teaser', locale: 'en' },
    });
  });

  it('shows the error status and fires NO event when the clipboard write is rejected', async () => {
    const writeText = vi.fn().mockRejectedValue(new Error('denied'));
    setClipboard(writeText);

    render(<CopyPromptButton prompt="THE PROMPT" locale="en" />);

    const button = await screen.findByRole('button', { name: T.copy_label });
    fireEvent.click(button);

    await screen.findByText(T.error_label);
    expect(window.plausible).not.toHaveBeenCalled();
  });

  it('renders a manual fallback (no button, no event) when the clipboard API is unavailable', async () => {
    setClipboard(undefined);

    render(<CopyPromptButton prompt="THE PROMPT" locale="en" />);

    await waitFor(() => {
      expect(screen.getByText(T.manual_label)).toBeInTheDocument();
    });
    expect(screen.queryByRole('button')).toBeNull();
    // the prompt is still available as selectable text
    expect(screen.getByText('THE PROMPT')).toBeInTheDocument();
    expect(window.plausible).not.toHaveBeenCalled();
  });
});
