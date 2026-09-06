import { describe, expect, it } from 'vitest';
import { blocksToText, parseProposalMarkdown } from './proposal-markdown';

describe('parseProposalMarkdown', () => {
  it('parses paragraphs, # / ## headings, - bullet lists and inline **bold**', () => {
    const blocks = parseProposalMarkdown(
      ['# Title', '', 'First para with **bold** inside.', 'continues here.', '', '## Sub', '- one', '- **two** items', '', 'Last.'].join('\n'),
    );
    expect(blocks).toEqual([
      { type: 'heading', level: 1, spans: [{ text: 'Title', bold: false }] },
      {
        type: 'paragraph',
        spans: [
          { text: 'First para with ', bold: false },
          { text: 'bold', bold: true },
          { text: ' inside. continues here.', bold: false },
        ],
      },
      { type: 'heading', level: 2, spans: [{ text: 'Sub', bold: false }] },
      {
        type: 'bullets',
        items: [
          [{ text: 'one', bold: false }],
          [
            { text: 'two', bold: true },
            { text: ' items', bold: false },
          ],
        ],
      },
      { type: 'paragraph', spans: [{ text: 'Last.', bold: false }] },
    ]);
  });

  it('renders links, images, tables, HTML, code fences, ### and * bullets as their literal text', () => {
    const md = [
      '[Site](https://example.com) and ![img](x.png)',
      '',
      '| a | b |',
      '|---|---|',
      '',
      '<script>alert(1)</script>',
      '',
      '```',
      'code',
      '```',
      '',
      '### deeper',
      '* star bullet',
      '_underscore_ and `tick`',
    ].join('\n');
    const text = blocksToText(parseProposalMarkdown(md));
    expect(text).toContain('[Site](https://example.com) and ![img](x.png)');
    expect(text).toContain('| a | b | |---|---|');
    expect(text).toContain('<script>alert(1)</script>');
    expect(text).toContain('``` code ```');
    expect(text).toContain('### deeper * star bullet _underscore_ and `tick`');
    const blocks = parseProposalMarkdown(md);
    expect(blocks.every((b) => b.type === 'paragraph')).toBe(true);
  });

  it('unterminated or empty bold markers stay literal; a bullet list ends at a blank line or a non-bullet line', () => {
    const blocks = parseProposalMarkdown('**open and **** empty\n- a\nnot a bullet\n- b');
    expect(blocks[0]).toEqual({
      type: 'paragraph',
      spans: [
        { text: 'open and ', bold: true },
        { text: '** empty', bold: false },
      ],
    });
    expect(parseProposalMarkdown('**unterminated')).toEqual([{ type: 'paragraph', spans: [{ text: '**unterminated', bold: false }] }]);
    expect(parseProposalMarkdown('****')).toEqual([{ type: 'paragraph', spans: [{ text: '****', bold: false }] }]);
    expect(blocks[1]).toEqual({ type: 'bullets', items: [[{ text: 'a', bold: false }]] });
    expect(blocks[2]).toEqual({ type: 'paragraph', spans: [{ text: 'not a bullet', bold: false }] });
    expect(blocks[3]).toEqual({ type: 'bullets', items: [[{ text: 'b', bold: false }]] });
  });

  it('empty and whitespace-only input yields no blocks; CRLF is tolerated; a lone "#" is literal', () => {
    expect(parseProposalMarkdown('')).toEqual([]);
    expect(parseProposalMarkdown('  \n\n ')).toEqual([]);
    expect(parseProposalMarkdown('# A\r\n\r\nB')).toEqual([
      { type: 'heading', level: 1, spans: [{ text: 'A', bold: false }] },
      { type: 'paragraph', spans: [{ text: 'B', bold: false }] },
    ]);
    expect(parseProposalMarkdown('#\n#nospace')).toEqual([{ type: 'paragraph', spans: [{ text: '# #nospace', bold: false }] }]);
  });

  it('handles Japanese text and the provisional dagger as plain characters', () => {
    const blocks = parseProposalMarkdown('## 主な発見\n- 予約の約6割†が電話経由（口頭でのご共有）');
    expect(blocksToText(blocks)).toBe('主な発見 予約の約6割†が電話経由（口頭でのご共有）');
  });
});

describe('renderer parity', () => {
  it('the HTML (ProposalBlocks) and PDF (blocksToPdf) renderers of one fixture produce identical text content', async () => {
    const { renderToStaticMarkup } = await import('react-dom/server');
    const React = (await import('react')).default;
    const { ProposalBlocks } = await import('@/components/proposal/ProposalBlocks');
    const { blocksToPdf } = await import('./proposal-pdf-blocks');
    const md = ['# Heading one', '', 'A **bold** paragraph', 'across lines.', '', '## Sub', '- first **item**', '- second', '', '[link](x) | table | ### h3', '', '- 予約の約6割†が電話経由'].join('\n');
    const blocks = parseProposalMarkdown(md);

    const html = renderToStaticMarkup(React.createElement(ProposalBlocks, { blocks }));
    const htmlText = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

    const Stub = ({ children }: { children?: React.ReactNode }) => React.createElement('x', null, children);
    const styles = { h1: {}, h2: {}, p: {}, bullet: {}, bulletDot: {}, bulletText: {}, bold: {} };
    const pdf = renderToStaticMarkup(React.createElement('root', null, ...blocksToPdf(blocks, 'en', { Text: Stub, View: Stub, styles })));
    const pdfText = pdf.replace(/<[^>]+>/g, ' ').replace(/•/g, ' ').replace(/\s+/g, ' ').trim();

    expect(htmlText).toBe(pdfText);
    expect(htmlText).toBe(blocksToText(blocks).replace(/\s+/g, ' '));
    expect(html).not.toContain('<a ');
    expect(html).toContain('[link](x) | table | ### h3');
  });
});
