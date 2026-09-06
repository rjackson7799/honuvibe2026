// The proposal PDF — lib/tutoring/generate-report-pdf.ts's styling (dark
// header bar, DM Serif Display titles, DM Sans body, registerFonts() with
// Noto Sans JP + cjkHyphenate) over the ProposalDocModel, through
// blocksToPdf() so the PDF's narrative is byte-for-byte the same blocks the
// page and the editor preview render. The renderer takes ONLY the model —
// nothing internal can reach the document. Issued rows never call this: the
// archived bytes are the artefact; only draft|ready previews render live,
// with the watermark band.

import React from 'react';
import { renderToBuffer, Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer';
import { registerFonts } from '@/lib/pdf/fonts';
import { blocksToPdf, type PdfPrimitives } from './proposal-pdf-blocks';
import type { ProposalDocModel } from './proposal-document';

const TEAL = '#2dd4bf';
const DARK_BG = '#1a1f2e';
const AMBER = '#b45309';
const AMBER_BG = '#fef3c7';
const TEXT = '#334155';
const MUTED = '#94a3b8';
const SECONDARY = '#64748b';
const BORDER = '#e2e8f0';
const WHITE = '#ffffff';
const ROW_BG = '#f8fafc';

const h = React.createElement;

function makeStyles(ja: boolean) {
  const body = ja ? 'Noto Sans JP' : 'DM Sans';
  const lh = ja ? 1.75 : 1.5;
  const ls = ja ? 0.3 : 0;
  return StyleSheet.create({
    page: { paddingTop: 48, paddingBottom: 64, paddingHorizontal: 48, fontFamily: body, fontSize: 10, lineHeight: lh, letterSpacing: ls, color: TEXT, backgroundColor: WHITE },
    headerBar: { backgroundColor: DARK_BG, marginHorizontal: -48, marginTop: -48, paddingHorizontal: 48, paddingVertical: 22, marginBottom: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    wordmark: { fontFamily: 'DM Sans', fontSize: 13, fontWeight: 700, color: WHITE },
    wordmarkAccent: { color: TEAL },
    lockup: { fontFamily: ja ? 'Noto Sans JP' : 'DM Serif Display', fontSize: 12, color: WHITE, maxWidth: 260, textAlign: 'right' },
    watermark: { backgroundColor: AMBER_BG, marginHorizontal: -48, paddingHorizontal: 48, paddingVertical: 6, marginBottom: 12 },
    watermarkText: { fontFamily: body, fontSize: 9, fontWeight: 700, color: AMBER, letterSpacing: ja ? 0.3 : 1 },
    cover: { marginBottom: 18, paddingBottom: 14, borderBottom: `1px solid ${BORDER}` },
    coverTitle: { fontFamily: ja ? 'Noto Sans JP' : 'DM Serif Display', fontSize: 22, fontWeight: ja ? 700 : 400, color: DARK_BG, marginBottom: 6, lineHeight: ja ? 1.5 : 1.2 },
    coverLine: { fontSize: 10, color: SECONDARY, marginTop: 2 },
    coverStrong: { fontSize: 11, color: TEXT, marginTop: 6 },
    sectionTitle: { fontFamily: ja ? 'Noto Sans JP' : 'DM Serif Display', fontSize: 14, fontWeight: ja ? 700 : 400, color: DARK_BG, marginTop: 16, marginBottom: 6, paddingBottom: 3, borderBottom: `1px solid ${BORDER}` },
    h1: { fontFamily: body, fontSize: 11.5, fontWeight: 700, color: DARK_BG, marginTop: 8, marginBottom: 3 },
    h2: { fontFamily: body, fontSize: 10.5, fontWeight: 700, color: TEXT, marginTop: 6, marginBottom: 2 },
    p: { fontFamily: body, fontSize: 10, lineHeight: lh, color: TEXT, marginBottom: 5 },
    bullet: { flexDirection: 'row', marginBottom: 3, paddingLeft: 4 },
    bulletDot: { width: 12, fontSize: 10, color: SECONDARY },
    bulletText: { flex: 1, fontFamily: body, fontSize: 10, lineHeight: lh, color: TEXT },
    bold: { fontWeight: 700 },
    table: { marginTop: 4, marginBottom: 10, border: `1px solid ${BORDER}`, borderRadius: 4 },
    tr: { flexDirection: 'row', paddingVertical: 5, paddingHorizontal: 8, borderBottom: `1px solid ${BORDER}` },
    trHead: { backgroundColor: ROW_BG },
    trTotal: { backgroundColor: ROW_BG, borderBottom: 'none' },
    tdLabel: { flex: 1, paddingRight: 6 },
    tdLabelText: { fontFamily: body, fontSize: 10, color: TEXT },
    tdValueText: { fontFamily: body, fontSize: 8.5, color: SECONDARY, marginTop: 1 },
    tdMoney: { width: 82, textAlign: 'right' },
    tdMoneyText: { fontFamily: 'DM Sans', fontSize: 10, color: TEXT },
    tdHeadText: { fontFamily: body, fontSize: 8, color: MUTED, textTransform: 'uppercase', letterSpacing: 0.8 },
    totalText: { fontFamily: body, fontSize: 10.5, fontWeight: 700, color: DARK_BG },
    totalMoney: { fontFamily: 'DM Sans', fontSize: 10.5, fontWeight: 700, color: DARK_BG },
    muted: { fontFamily: body, fontSize: 9, color: MUTED, marginTop: 2, marginBottom: 6 },
    perfRow: { flexDirection: 'row', paddingVertical: 3 },
    perfLabel: { width: 130, fontFamily: body, fontSize: 9.5, fontWeight: 700, color: TEXT },
    perfValue: { flex: 1, fontFamily: body, fontSize: 9.5, color: TEXT },
    footnote: { fontFamily: body, fontSize: 8.5, color: SECONDARY, marginTop: 14, paddingTop: 6, borderTop: `1px solid ${BORDER}` },
    footer: { position: 'absolute', bottom: 24, left: 48, right: 48, flexDirection: 'row', justifyContent: 'space-between', borderTop: `1px solid ${BORDER}`, paddingTop: 8 },
    footerText: { fontFamily: body, fontSize: 7, color: MUTED },
  });
}

export async function generateProposalPdf(model: ProposalDocModel): Promise<Buffer> {
  registerFonts();
  const ja = model.locale === 'ja';
  const s = makeStyles(ja);
  const prim: PdfPrimitives = {
    Text,
    View,
    styles: { h1: s.h1, h2: s.h2, p: s.p, bullet: s.bullet, bulletDot: s.bulletDot, bulletText: s.bulletText, bold: s.bold },
  };
  const { cover, investment, labels } = model;

  const investmentTable = h(
    View,
    { key: 'table', style: s.table },
    h(View, { style: [s.tr, s.trHead] },
      h(View, { style: s.tdLabel }, h(Text, { style: s.tdHeadText }, labels.item)),
      h(View, { style: s.tdMoney }, h(Text, { style: s.tdHeadText }, labels.build)),
      h(View, { style: s.tdMoney }, h(Text, { style: s.tdHeadText }, labels.monthly)),
    ),
    ...investment.rows.map((r, i) =>
      h(View, { key: i, style: s.tr },
        h(View, { style: s.tdLabel },
          h(Text, { style: s.tdLabelText }, r.label),
          r.value ? h(Text, { style: s.tdValueText }, r.value) : null,
        ),
        h(View, { style: s.tdMoney }, h(Text, { style: s.tdMoneyText }, r.build)),
        h(View, { style: s.tdMoney }, h(Text, { style: s.tdMoneyText }, r.monthly)),
      ),
    ),
    h(View, { style: [s.tr, s.trTotal] },
      h(View, { style: s.tdLabel }, h(Text, { style: s.totalText }, `${labels.total_build} · ${labels.total_monthly}`)),
      h(View, { style: s.tdMoney }, h(Text, { style: s.totalMoney }, investment.total_build)),
      h(View, { style: s.tdMoney }, h(Text, { style: s.totalMoney }, investment.total_monthly)),
    ),
  );

  const performance = investment.performance
    ? h(View, { key: 'perf', style: { marginBottom: 8 } },
        ...investment.performance.map((row, i) =>
          h(View, { key: i, style: s.perfRow },
            h(Text, { style: s.perfLabel }, row.label),
            h(Text, { style: s.perfValue }, row.value),
          ),
        ),
      )
    : null;

  const sections = model.sections.map((sec, i) =>
    h(View, { key: sec.key },
      h(Text, { style: s.sectionTitle }, sec.mark ? `${sec.title} ${sec.mark}` : sec.title),
      ...(sec.key === 'investment_notes'
        ? [investmentTable, investment.usd_reference ? h(Text, { key: 'usd', style: s.muted }, investment.usd_reference) : null]
        : []),
      ...(sec.key === 'terms' && performance ? [performance] : []),
      ...blocksToPdf(sec.blocks, model.locale, prim),
      ...(i === model.sections.length - 1 ? [] : []),
    ),
  );

  const doc = h(Document, { title: `${cover.title} — ${cover.proposal_line}`, author: 'HonuVibe Studio', language: ja ? 'ja' : 'en' },
    h(Page, { size: 'A4', style: s.page, wrap: true },
      h(View, { style: s.headerBar, fixed: true },
        h(Text, { style: s.wordmark }, 'HonuVibe', h(Text, { style: s.wordmarkAccent }, ' Studio')),
        h(Text, { style: s.lockup }, cover.business_name),
      ),
      model.watermark
        ? h(View, { style: s.watermark, fixed: true }, h(Text, { style: s.watermarkText }, cover.preview_band))
        : null,
      h(View, { style: s.cover },
        h(Text, { style: s.coverTitle }, cover.title),
        h(Text, { style: s.coverLine }, `${cover.proposal_line} · ${cover.issued_line}`),
        h(Text, { style: s.coverStrong }, cover.prepared_for_line),
        cover.valid_until_line ? h(Text, { style: s.coverLine }, cover.valid_until_line) : null,
      ),
      ...sections,
      model.footnote ? h(Text, { style: s.footnote }, model.footnote) : null,
      h(View, { style: s.footer, fixed: true },
        h(Text, { style: s.footerText }, model.footer),
        h(Text, { style: s.footerText, render: ({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) => `${pageNumber} / ${totalPages}` }),
      ),
    ),
  );

  const buffer = await renderToBuffer(doc);
  return Buffer.from(buffer);
}
