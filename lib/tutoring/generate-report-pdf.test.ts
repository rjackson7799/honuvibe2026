import { describe, expect, test } from 'vitest';
import fs from 'fs';
import path from 'path';
import { generateReportPdf } from './generate-report-pdf';
import { sampleReportDocModel } from './report-doc-model.fixture';

describe('generateReportPdf (bundled local fonts)', () => {
  test('the six bundled font files exist on disk', () => {
    const dir = path.join(process.cwd(), 'lib/pdf/fonts');
    for (const f of [
      'DMSerifDisplay-Regular.ttf',
      'DMSans-Regular.ttf',
      'DMSans-Italic.ttf',
      'DMSans-SemiBold.ttf',
      'DMSans-Bold.ttf',
      'NotoSansJP-Regular.ttf',
      'NotoSansJP-Bold.ttf',
    ]) {
      expect(fs.existsSync(path.join(dir, f)), `${f} missing`).toBe(true);
    }
  });

  test('renders a valid PDF from a minimal model', async () => {
    const buffer = await generateReportPdf(sampleReportDocModel());
    expect(buffer.length).toBeGreaterThan(1000);
    expect(buffer.subarray(0, 5).toString('latin1')).toBe('%PDF-');
  }, 30_000);
});
