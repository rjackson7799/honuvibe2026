// Proposal page chrome copy — the `const T = { en, ja }` convention from
// components/engagement/copy.ts. The JA strings ship FLAGGED FOR NATIVE
// REVIEW per CLAUDE.md (no unreviewed machine translation in production);
// see the ship report. The document's own copy (cover labels, investment
// labels, the provisional footnote, the footer) is frozen INSIDE
// issued_snapshot at issue time and is not here — this module is only the
// page around the document: status bands, the accept form, the fatal cards.

export const T = {
  en: {
    eyebrow: 'Proposal',
    downloadPdf: 'Download PDF',
    // Status bands (top of page)
    openBand: (validUntil: string | null) =>
      validUntil ? `Read the proposal below and accept it at the bottom when you're ready. It is valid until ${validUntil}.` : "Read the proposal below and accept it at the bottom when you're ready.",
    expiredBandTitle: 'This proposal has expired',
    expiredBandBody: (validUntil: string | null) =>
      validUntil
        ? `It was valid until ${validUntil}. Reply to the email you received and Ryan will send you a current version.`
        : 'Reply to the email you received and Ryan will send you a current version.',
    acceptedBandTitle: 'Accepted',
    acceptedBand: (name: string, date: string) => `Accepted by ${name} on ${date}. This page and the PDF stay available to you.`,
    // Deposit band states (075). The amount is pre-formatted by
    // formatMinorUnits, so JPY never grows decimals.
    depositDueBand: (name: string, date: string, amount: string) =>
      `Accepted by ${name} on ${date}. Your deposit of ${amount} is ready to pay — work starts once it is received.`,
    depositButton: 'Pay the deposit →',
    depositButtonBusy: 'Opening Stripe…',
    depositSecureNote: "You'll pay on Stripe's secure page. We never see your card details.",
    depositPendingBand:
      'Your payment is in progress. Once Stripe confirms it, this page will show the deposit as received.',
    depositThanksBand:
      'Thank you. Once Stripe confirms your payment, this page will show the deposit as received.',
    depositPaidBandTitle: 'Deposit received',
    depositPaidBand: (name: string, date: string, amount: string, paidOn: string) =>
      `Accepted by ${name} on ${date}. Deposit of ${amount} received on ${paidOn}. Ryan will be in touch about kickoff.`,
    depositRefundedBandTitle: 'Deposit refunded',
    depositRefundedBand: (amount: string, date: string) =>
      `The deposit of ${amount} was refunded on ${date}. Reply to the email you received if you have questions.`,
    // Deposit button errors
    depositAlreadyPaid: 'This deposit has already been paid — reload the page.',
    depositPaymentPending:
      'A payment for this deposit is already in progress — once Stripe confirms it, this page will show it as received.',
    depositNotOpen: 'This deposit is no longer open. Reply to the email you received and Ryan will help.',
    depositForbidden: 'Open the newest link from your email and try again.',
    depositUnavailable: 'Payments are temporarily unavailable — please try again in a few minutes.',
    depositRateLimited: 'Too many attempts — please wait a few minutes and try again.',
    closedBandTitle: 'This proposal is no longer open',
    closedBandBody: 'A newer version may have replaced it. Open the newest link from your email, or reply to it and Ryan will send a fresh one.',
    // Accept form
    acceptTitle: 'Accept this proposal',
    acceptIntro: (business: string) => `Type your name and confirm to accept the proposal on behalf of ${business}.`,
    nameLabel: 'Your name',
    namePlaceholder: 'Full name, as it should appear on the record',
    checkboxLabel: (business: string) => `I accept this proposal on behalf of ${business}`,
    acceptButton: 'Accept proposal',
    accepting: 'Accepting…',
    clickWrapNote: 'Accepting here records your name, the date and this exact version of the proposal.',
    // Accept outcomes
    recordedTitle: 'Thank you — your acceptance is recorded.',
    recordedBody: 'Ryan will be in touch about kickoff. This page and the PDF stay available to you.',
    alreadyAcceptedTitle: 'This proposal has already been accepted',
    alreadyAcceptedBody: 'Nothing more to do — reload the page to see who accepted it and when.',
    expiredTitle: 'This proposal has expired',
    expiredBody: 'Reply to the email you received and Ryan will send you a current version.',
    notOpenTitle: 'This proposal is no longer open',
    notOpenBody: 'A newer version may have replaced it. Open the newest link from your email.',
    rateLimitedTitle: 'Too many attempts',
    rateLimitedBody: 'Please wait a few minutes and try again.',
    errorBody: 'Something went wrong — please try again. Nothing was recorded.',
    // Fatal cards (page-level)
    forbiddenTitle: 'This link needs to be opened from your email again',
    forbiddenBody: 'Your browser is not holding the key for this proposal — that happens after clearing cookies, switching browsers, or if the link was revoked or replaced. Open the newest link from your email, or reply to it and Ryan will send a fresh one.',
    linkExpiredTitle: 'This link has expired',
    linkExpiredBody: 'Reply to the email you received and Ryan will send you a fresh link to your proposal.',
    unavailableTitle: 'Temporarily unavailable',
    unavailableBody: 'Please try again in a few minutes.',
  },
  ja: {
    eyebrow: 'ご提案書',
    downloadPdf: 'PDFをダウンロード',
    openBand: (validUntil: string | null) =>
      validUntil ? `以下のご提案書をご確認のうえ、ページ下部でご承諾ください。有効期限は ${validUntil} です。` : '以下のご提案書をご確認のうえ、ページ下部でご承諾ください。',
    expiredBandTitle: 'この提案は有効期限を過ぎています',
    expiredBandBody: (validUntil: string | null) =>
      validUntil
        ? `有効期限は ${validUntil} でした。届いたメールに返信していただければ、最新の内容をお送りします。`
        : '届いたメールに返信していただければ、最新の内容をお送りします。',
    acceptedBandTitle: '承諾済み',
    acceptedBand: (name: string, date: string) => `${date} に ${name} 様がご承諾されました。このページとPDFは引き続きご覧いただけます。`,
    depositDueBand: (name: string, date: string, amount: string) =>
      `${date} に ${name} 様がご承諾されました。着手金 ${amount} のお支払いをお願いいたします。ご入金の確認後に制作を開始します。`,
    depositButton: 'お支払いに進む →',
    depositButtonBusy: 'Stripeを開いています…',
    depositSecureNote: 'お支払いはStripeの安全な決済ページで行われます。当方がカード情報を見ることはありません。',
    depositPendingBand:
      'お支払い手続き中です。Stripeで確認が取れ次第、このページに受領として表示されます。',
    depositThanksBand:
      'ありがとうございます。Stripeでお支払いが確認され次第、このページに受領として表示されます。',
    depositPaidBandTitle: 'お支払いを受領しました',
    depositPaidBand: (name: string, date: string, amount: string, paidOn: string) =>
      `${date} に ${name} 様がご承諾されました。${amount} を ${paidOn} に受領いたしました。キックオフについてRyanからご連絡します。`,
    depositRefundedBandTitle: 'お支払いを返金しました',
    depositRefundedBand: (amount: string, date: string) =>
      `${amount} を ${date} に返金いたしました。ご不明な点があれば、届いたメールにご返信ください。`,
    depositAlreadyPaid: 'このお支払いは完了しています。ページを再読み込みしてください。',
    depositPaymentPending:
      'お支払いはすでに手続き中です。Stripeで確認が取れ次第、このページに受領として表示されます。',
    depositNotOpen: 'このお支払いは現在受け付けていません。届いたメールにご返信ください。',
    depositForbidden: 'メールに届いた最新のリンクを開いて、もう一度お試しください。',
    depositUnavailable: 'お支払いは一時的にご利用いただけません。数分後にもう一度お試しください。',
    depositRateLimited: '試行回数が多すぎます。数分待ってから、もう一度お試しください。',
    closedBandTitle: 'この提案は現在受け付けていません',
    closedBandBody: '新しいバージョンに置き換えられた可能性があります。メールに届いた最新のリンクを開くか、メールに返信していただければ新しいリンクをお送りします。',
    acceptTitle: 'この提案を承諾する',
    acceptIntro: (business: string) => `${business} を代表して承諾される方のお名前を入力し、確認欄にチェックを入れてください。`,
    nameLabel: 'お名前',
    namePlaceholder: '記録に残す氏名（フルネーム）',
    checkboxLabel: (business: string) => `${business} を代表して、この提案を承諾します`,
    acceptButton: '提案を承諾する',
    accepting: '送信中…',
    clickWrapNote: 'ここで承諾すると、お名前、日付、そしてこの提案書のこのバージョンが記録されます。',
    recordedTitle: 'ありがとうございます。ご承諾を記録しました。',
    recordedBody: 'キックオフについてRyanからご連絡します。このページとPDFは引き続きご覧いただけます。',
    alreadyAcceptedTitle: 'この提案はすでに承諾されています',
    alreadyAcceptedBody: '追加の手続きはありません。ページを再読み込みすると、承諾者と日付が表示されます。',
    expiredTitle: 'この提案は有効期限を過ぎています',
    expiredBody: '届いたメールに返信していただければ、最新の内容をお送りします。',
    notOpenTitle: 'この提案は現在受け付けていません',
    notOpenBody: '新しいバージョンに置き換えられた可能性があります。メールに届いた最新のリンクを開いてください。',
    rateLimitedTitle: '試行回数が多すぎます',
    rateLimitedBody: '数分待ってから、もう一度お試しください。',
    errorBody: '問題が発生しました。もう一度お試しください。まだ何も記録されていません。',
    forbiddenTitle: 'メールのリンクからもう一度開いてください',
    forbiddenBody: 'このブラウザに提案書の鍵が保存されていません。Cookieの削除やブラウザの変更、またはリンクが無効化・差し替えされた場合に起こります。メールに届いた最新のリンクを開くか、メールに返信していただければ新しいリンクをお送りします。',
    linkExpiredTitle: 'このリンクは期限切れです',
    linkExpiredBody: '届いたメールに返信していただければ、提案書への新しいリンクをお送りします。',
    unavailableTitle: '一時的にご利用いただけません',
    unavailableBody: '数分後にもう一度お試しください。',
  },
};

export type ProposalCopy = (typeof T)['en'];

/** The JP typography rule — on an INNER wrapper, never on the data-shell element (see QuestionnaireApp.tsx). */
export const JP_TEXT_CLASS = 'font-[family-name:var(--font-noto-sans-jp)] leading-[1.75] tracking-[0.03em]';
