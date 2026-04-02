import { getResendClient, getFromAddress, getAdminEmail } from './client';
import {
  baseLayout,
  heading,
  paragraph,
  ctaButton,
  divider,
  detailsTable,
  accentBanner,
} from './templates';
import type {
  ContactEmailData,
  NewsletterAdminNotifyData,
  ApplicationEmailData,
  EnrollmentEmailData,
  HonuHubContactEmailData,
  ExplorationInquiryEmailData,
  ApplicationStatusEmailData,
  InstructorWelcomeEmailData,
  StudentWelcomeEmailData,
  VerticeLeadEmailData,
} from './types';

// ─── Internal helper ────────────────────────────────────────

async function sendEmail(options: {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
}): Promise<void> {
  const resend = getResendClient();
  if (!resend || !options.to) return;

  try {
    const { error } = await resend.emails.send({
      from: getFromAddress(),
      to: options.to,
      subject: options.subject,
      html: options.html,
      replyTo: options.replyTo,
    });

    if (error) {
      console.error('[HonuVibe Email] Send failed:', error.name, error.message);
    }
  } catch (err) {
    console.error('[HonuVibe Email] Unexpected error:', err);
  }
}

// ─── 1. Contact Form ────────────────────────────────────────

export async function sendContactConfirmation(data: ContactEmailData): Promise<void> {
  const { locale, name, subject } = data;
  const isJP = locale === 'ja';
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://honuvibe.ai';

  const body = [
    heading(isJP ? `${name} さん、お問い合わせありがとうございます` : `Thank you, ${name}`),
    paragraph(
      isJP
        ? 'お問い合わせを受け付けました。通常2営業日以内にご返信いたします。'
        : "We've received your message and will get back to you within 2 business days.",
    ),
    divider(),
    paragraph(isJP ? `件名: ${subject}` : `Subject: ${subject}`),
    paragraph(
      isJP
        ? 'その間、AIに関する最新のコースもご覧ください。'
        : 'In the meantime, feel free to explore our courses.',
    ),
    ctaButton({
      href: `${siteUrl}/${isJP ? 'ja/' : ''}learn`,
      label: isJP ? 'コースを見る' : 'Browse Courses',
    }),
  ].join('');

  await sendEmail({
    to: data.email,
    subject: isJP
      ? '【HonuVibe.AI】お問い合わせを受け付けました'
      : 'We received your message — HonuVibe.AI',
    html: baseLayout({
      locale,
      preheader: isJP ? 'お問い合わせありがとうございます' : 'Thanks for reaching out!',
      body,
    }),
  });
}

export async function sendContactAdminNotification(data: ContactEmailData): Promise<void> {
  const adminEmail = getAdminEmail();
  if (!adminEmail) return;

  const body = [
    accentBanner('New Contact Form Submission'),
    detailsTable([
      { label: 'Name', value: data.name },
      { label: 'Email', value: data.email },
      { label: 'Subject', value: data.subject },
      { label: 'Locale', value: data.locale },
    ]),
    divider(),
    heading('Message'),
    paragraph(data.message),
  ].join('');

  await sendEmail({
    to: adminEmail,
    subject: `[Contact] ${data.subject} — from ${data.name}`,
    html: baseLayout({ locale: 'en', body }),
    replyTo: data.email,
  });
}

// ─── 2. Newsletter Admin Notification ───────────────────────

export async function sendNewsletterAdminNotification(
  data: NewsletterAdminNotifyData,
): Promise<void> {
  const adminEmail = getAdminEmail();
  if (!adminEmail) return;

  const body = [
    accentBanner('New Newsletter Subscriber'),
    paragraph('A new subscriber just joined the HonuVibe newsletter:'),
    detailsTable([
      { label: 'Email', value: data.email },
      { label: 'Source Locale', value: data.locale },
    ]),
  ].join('');

  await sendEmail({
    to: adminEmail,
    subject: `[Newsletter] New subscriber: ${data.email}`,
    html: baseLayout({ locale: 'en', body }),
  });
}

// ─── 3. Application / Consulting ────────────────────────────

export async function sendApplicationConfirmation(data: ApplicationEmailData): Promise<void> {
  const { locale, name } = data;
  const isJP = locale === 'ja';
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://honuvibe.ai';

  const body = [
    heading(
      isJP
        ? `${name} さん、お申し込みありがとうございます`
        : `Thank you for applying, ${name}`,
    ),
    paragraph(
      isJP
        ? 'コンサルティングのお申し込みを受け付けました。内容を確認の上、通常3営業日以内にご連絡いたします。'
        : "We've received your consulting application and will review it carefully. Expect to hear from us within 3 business days.",
    ),
    divider(),
    paragraph(
      isJP
        ? 'その間、AIに関する最新のコースもご覧ください。'
        : 'While you wait, explore our latest AI courses.',
    ),
    ctaButton({
      href: `${siteUrl}/${isJP ? 'ja/' : ''}learn`,
      label: isJP ? 'コースを見る' : 'Explore Courses',
    }),
  ].join('');

  await sendEmail({
    to: data.email,
    subject: isJP
      ? '【HonuVibe.AI】お申し込みを受け付けました'
      : 'Application received — HonuVibe.AI',
    html: baseLayout({
      locale,
      preheader: isJP ? 'お申し込みありがとうございます' : 'We received your application',
      body,
    }),
  });
}

export async function sendApplicationAdminNotification(
  data: ApplicationEmailData,
): Promise<void> {
  const adminEmail = getAdminEmail();
  if (!adminEmail) return;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://honuvibe.ai';

  const body = [
    accentBanner('New Consulting Application'),
    detailsTable([
      { label: 'Name', value: data.name },
      { label: 'Email', value: data.email },
      { label: 'Company', value: data.company ?? '' },
      { label: 'Website', value: data.website ?? '' },
      { label: 'Engagement', value: data.engagement ?? '' },
      { label: 'Timeline', value: data.timeline ?? '' },
      { label: 'Budget', value: data.budget ?? '' },
      { label: 'Referral', value: data.referralSource ?? '' },
      { label: 'Locale', value: data.locale },
    ]),
    divider(),
    heading('Project Description'),
    paragraph(data.project),
    ctaButton({
      href: `${siteUrl}/admin/applications`,
      label: 'View in Admin Panel',
    }),
  ].join('');

  await sendEmail({
    to: adminEmail,
    subject: `[Application] ${data.name} — ${data.engagement ?? 'Consulting'}`,
    html: baseLayout({ locale: 'en', body }),
    replyTo: data.email,
  });
}

// ─── 4. Enrollment Confirmation ─────────────────────────────

export async function sendEnrollmentConfirmation(data: EnrollmentEmailData): Promise<void> {
  const { locale, studentName, courseTitle, courseSlug, startDate, amountPaid, currency } = data;
  const isJP = locale === 'ja';
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://honuvibe.ai';

  const priceDisplay =
    amountPaid === 0
      ? isJP
        ? '無料'
        : 'Free'
      : currency === 'jpy'
        ? `¥${amountPaid.toLocaleString()}`
        : `$${(amountPaid / 100).toFixed(2)}`;

  const body = [
    accentBanner(isJP ? '受講登録完了' : "You're Enrolled!"),
    heading(isJP ? `${studentName} さん、ようこそ！` : `Welcome aboard, ${studentName}!`),
    paragraph(
      isJP
        ? `「${courseTitle}」への登録が完了しました。`
        : `You've been successfully enrolled in "${courseTitle}".`,
    ),
    detailsTable([
      { label: isJP ? 'コース' : 'Course', value: courseTitle },
      ...(startDate
        ? [{ label: isJP ? '開始日' : 'Start Date', value: startDate }]
        : []),
      { label: isJP ? '金額' : 'Amount', value: priceDisplay },
    ]),
    paragraph(
      isJP
        ? 'ダッシュボードからコース内容にアクセスできます。'
        : 'You can access your course materials from your dashboard.',
    ),
    ctaButton({
      href: `${siteUrl}/${isJP ? 'ja/' : ''}learn/${courseSlug}`,
      label: isJP ? 'コースに進む' : 'Go to Course',
    }),
  ].join('');

  await sendEmail({
    to: data.studentEmail,
    subject: isJP
      ? `【HonuVibe.AI】「${courseTitle}」への登録が完了しました`
      : `You're enrolled in "${courseTitle}" — HonuVibe.AI`,
    html: baseLayout({
      locale,
      preheader: isJP ? '受講登録が完了しました' : 'Your enrollment is confirmed',
      body,
    }),
  });
}

export async function sendEnrollmentAdminNotification(data: EnrollmentEmailData): Promise<void> {
  const adminEmail = getAdminEmail();
  if (!adminEmail) return;

  const priceDisplay =
    data.amountPaid === 0
      ? 'Free'
      : data.currency === 'jpy'
        ? `¥${data.amountPaid.toLocaleString()}`
        : `$${(data.amountPaid / 100).toFixed(2)}`;

  const body = [
    accentBanner(data.isManualEnroll ? 'Manual Enrollment Created' : 'New Student Enrollment'),
    detailsTable([
      { label: 'Student', value: data.studentName },
      { label: 'Email', value: data.studentEmail },
      { label: 'Course', value: data.courseTitle },
      { label: 'Type', value: data.isManualEnroll ? 'Manual (admin)' : 'Self-enrolled' },
      { label: 'Amount', value: priceDisplay },
    ]),
  ].join('');

  await sendEmail({
    to: adminEmail,
    subject: `[Enrollment] ${data.studentName} → ${data.courseTitle}`,
    html: baseLayout({ locale: 'en', body }),
  });
}

// ─── 5. HonuHub Contact ─────────────────────────────────────

export async function sendHonuHubContactConfirmation(
  data: HonuHubContactEmailData,
): Promise<void> {
  const { locale, name } = data;
  const isJP = locale === 'ja';

  const body = [
    heading(isJP ? `${name} さん、お問い合わせありがとうございます` : `Mahalo, ${name}!`),
    paragraph(
      isJP
        ? 'HonuHub Waikikiへのお問い合わせを受け付けました。担当者より2営業日以内にご連絡いたします。'
        : "We've received your inquiry about HonuHub Waikiki. Our team will reach out within 2 business days.",
    ),
  ].join('');

  await sendEmail({
    to: data.email,
    subject: isJP
      ? '【HonuVibe.AI】HonuHubへのお問い合わせ'
      : 'HonuHub inquiry received — HonuVibe.AI',
    html: baseLayout({
      locale,
      preheader: isJP ? 'お問い合わせありがとうございます' : 'Thanks for your HonuHub inquiry',
      body,
    }),
  });
}

export async function sendHonuHubContactAdminNotification(
  data: HonuHubContactEmailData,
): Promise<void> {
  const adminEmail = getAdminEmail();
  if (!adminEmail) return;

  const typeLabels: Record<string, string> = {
    group: 'Group Session',
    corporate: 'Corporate',
    partnership: 'Partnership',
    other: 'Other',
  };

  const body = [
    accentBanner('New HonuHub Inquiry'),
    detailsTable([
      { label: 'Name', value: data.name },
      { label: 'Email', value: data.email },
      { label: 'Type', value: typeLabels[data.type] ?? data.type },
      { label: 'Locale', value: data.locale },
    ]),
    divider(),
    heading('Message'),
    paragraph(data.message),
  ].join('');

  await sendEmail({
    to: adminEmail,
    subject: `[HonuHub] ${typeLabels[data.type] ?? data.type} — from ${data.name}`,
    html: baseLayout({ locale: 'en', body }),
    replyTo: data.email,
  });
}

// ─── 6. Exploration Inquiry ──────────────────────────────────

export async function sendExplorationInquiryConfirmation(
  data: ExplorationInquiryEmailData,
): Promise<void> {
  const { locale, name } = data;
  const isJP = locale === 'ja';
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://honuvibe.ai';

  const body = [
    heading(isJP ? `${name} さん、お問い合わせありがとうございます` : `Thank you, ${name}!`),
    paragraph(
      isJP
        ? 'プロジェクトのお問い合わせを受け付けました。通常2営業日以内にご連絡いたします。'
        : "We've received your project inquiry and will get back to you within 2 business days.",
    ),
    divider(),
    paragraph(
      isJP
        ? 'その間、私たちのプロジェクトをご覧ください。'
        : 'In the meantime, explore our work and projects.',
    ),
    ctaButton({
      href: `${siteUrl}/${isJP ? 'ja/' : ''}exploration`,
      label: isJP ? 'プロジェクトを見る' : 'View Projects',
    }),
  ].join('');

  await sendEmail({
    to: data.email,
    subject: isJP
      ? '【HonuVibe.AI】プロジェクトのお問い合わせを受け付けました'
      : 'Project inquiry received — HonuVibe.AI',
    html: baseLayout({
      locale,
      preheader: isJP ? 'お問い合わせありがとうございます' : 'Thanks for reaching out!',
      body,
    }),
  });
}

export async function sendExplorationInquiryAdminNotification(
  data: ExplorationInquiryEmailData,
): Promise<void> {
  const adminEmail = getAdminEmail();
  if (!adminEmail) return;

  const body = [
    accentBanner('New Exploration Inquiry'),
    detailsTable([
      { label: 'Name', value: data.name },
      { label: 'Email', value: data.email },
      { label: 'Company', value: data.company ?? '—' },
      { label: 'Locale', value: data.locale },
    ]),
    divider(),
    heading('Project Description'),
    paragraph(data.message),
  ].join('');

  await sendEmail({
    to: adminEmail,
    subject: `[Exploration] New inquiry from ${data.name}`,
    html: baseLayout({ locale: 'en', body }),
    replyTo: data.email,
  });
}

// ─── 7. Application Status Update ───────────────────────────

export async function sendApplicationStatusUpdate(
  data: ApplicationStatusEmailData,
): Promise<void> {
  const { locale, applicantName, newStatus, notes } = data;
  const isJP = locale === 'ja';
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://honuvibe.ai';

  const statusMessages: Record<string, { en: string; ja: string }> = {
    reviewing: {
      en: "Your application is now being reviewed by our team. We'll be in touch soon with next steps.",
      ja: 'お申し込みを現在審査中です。次のステップについて近日中にご連絡いたします。',
    },
    responded: {
      en: "We've reviewed your application and have sent a detailed response. Please check your inbox.",
      ja: 'お申し込みの審査が完了し、詳細なご回答をお送りしました。受信トレイをご確認ください。',
    },
    archived: {
      en: 'Your application has been processed. Thank you for your interest in HonuVibe.AI.',
      ja: 'お申し込みの処理が完了しました。HonuVibe.AIにご関心をお寄せいただき、ありがとうございます。',
    },
  };

  // Don't send email for "received" status (the initial confirmation covers that)
  if (newStatus === 'received') return;

  const statusMsg = statusMessages[newStatus];
  if (!statusMsg) return;

  const body = [
    heading(isJP ? `${applicantName} さんへ` : `Hi ${applicantName}`),
    paragraph(isJP ? statusMsg.ja : statusMsg.en),
    ...(notes ? [divider(), paragraph(notes)] : []),
    ctaButton({
      href: `${siteUrl}/${isJP ? 'ja/' : ''}contact`,
      label: isJP ? 'お問い合わせ' : 'Contact Us',
    }),
  ].join('');

  await sendEmail({
    to: data.applicantEmail,
    subject: isJP
      ? '【HonuVibe.AI】お申し込み状況の更新'
      : 'Application update — HonuVibe.AI',
    html: baseLayout({ locale, body }),
  });
}

// ─── 8. Instructor Welcome ──────────────────────────────

export async function sendInstructorWelcomeEmail(data: InstructorWelcomeEmailData): Promise<void> {
  const { locale, displayName, email, titleEn, titleJp, actionLink, type } = data;
  const isJP = locale === 'ja';
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://honuvibe.ai';

  const title = isJP ? (titleJp || titleEn || '') : (titleEn || titleJp || '');

  const isNew = type === 'new';

  const body = [
    accentBanner(
      isJP ? '講師チームへようこそ！' : 'Welcome to the Teaching Team!',
    ),
    heading(
      isJP
        ? `${displayName} さん、おめでとうございます！`
        : `Congratulations, ${displayName}!`,
    ),
    paragraph(
      isJP
        ? isNew
          ? 'HonuVibe.AIの講師としてアカウントが作成されました。下のボタンからパスワードを設定して、ダッシュボードにアクセスしてください。'
          : 'HonuVibe.AIの講師に昇格されました。ダッシュボードからコース管理が可能です。'
        : isNew
          ? 'Your instructor account has been created on HonuVibe.AI. Click the button below to set your password and access your dashboard.'
          : "You've been promoted to instructor on HonuVibe.AI. You can now manage courses from your dashboard.",
    ),
    ...(title
      ? [
          detailsTable([
            { label: isJP ? '役職' : 'Title', value: title },
            { label: isJP ? 'メール' : 'Email', value: email },
          ]),
        ]
      : []),
    ctaButton({
      href: actionLink,
      label: isJP
        ? isNew
          ? 'パスワードを設定する'
          : 'ダッシュボードにログイン'
        : isNew
          ? 'Set Your Password'
          : 'Log In to Your Dashboard',
    }),
    ...(isNew
      ? [
          paragraph(
            isJP
              ? 'このリンクは24時間有効です。期限が切れた場合は、ログインページの「パスワードを忘れた方」からリセットできます。'
              : 'This link expires in 24 hours. If it expires, you can use "Forgot Password" on the login page to get a new one.',
          ),
        ]
      : []),
    divider(),
    paragraph(
      isJP
        ? 'ご質問がありましたら、お気軽にお問い合わせください。'
        : "If you have any questions, don't hesitate to reach out.",
    ),
    ctaButton({
      href: `${siteUrl}/${isJP ? 'ja/' : ''}contact`,
      label: isJP ? 'お問い合わせ' : 'Contact Us',
    }),
  ].join('');

  await sendEmail({
    to: email,
    subject: isJP
      ? '【HonuVibe.AI】講師チームへようこそ！'
      : 'Welcome to the HonuVibe.AI Teaching Team!',
    html: baseLayout({
      locale,
      preheader: isJP ? '講師アカウントが準備できました' : 'Your instructor account is ready',
      body,
    }),
  });
}

export async function sendInstructorWelcomeAdminNotification(data: {
  displayName: string;
  email: string;
  type: 'new' | 'promoted';
  emailSent: boolean;
}): Promise<void> {
  const adminEmail = getAdminEmail();
  if (!adminEmail) return;

  const body = [
    accentBanner(data.type === 'new' ? 'New Instructor Created' : 'Instructor Promoted'),
    detailsTable([
      { label: 'Name', value: data.displayName },
      { label: 'Email', value: data.email },
      { label: 'Type', value: data.type === 'new' ? 'New account' : 'Promoted from student' },
      { label: 'Welcome Email', value: data.emailSent ? 'Sent' : 'Not sent' },
    ]),
  ].join('');

  await sendEmail({
    to: adminEmail,
    subject: `[Instructor] ${data.type === 'new' ? 'New' : 'Promoted'}: ${data.displayName}`,
    html: baseLayout({ locale: 'en', body }),
  });
}

// ─── 9. Vertice Society Lead ──────────────────────────────

export async function sendVerticeLeadConfirmation(data: VerticeLeadEmailData): Promise<void> {
  const { locale, fullName, email } = data;
  const isJP = locale === 'ja';
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://honuvibe.ai';
  const firstName = fullName.split(' ')[0];
  const downloadUrlEN = `${siteUrl}/downloads/Vertice_Honu_AI_Mastery_Course_EN.pdf`;
  const downloadUrlJP = `${siteUrl}/downloads/Vertice_Honu_AI_Mastery_Course_JP.pdf`;

  const body = [
    accentBanner(isJP ? 'AI Mastery コースへようこそ' : 'Welcome to AI Mastery'),
    heading(
      isJP
        ? `${firstName}さん、お申し込みありがとうございます`
        : `Welcome, ${firstName}!`,
    ),
    paragraph(
      isJP
        ? 'Vertice Society限定「AI Mastery — From Curious to Confident」コースへのお申し込みを受け付けました。'
        : 'Your registration for the Vertice Society exclusive "AI Mastery — From Curious to Confident" course has been received.',
    ),
    divider(),
    heading(isJP ? '5週間コース概要' : '5-Week Course Overview'),
    paragraph(
      isJP
        ? 'Week 1: AI基礎 — AIの現状と主要ツールの紹介'
        : 'Week 1: AI Foundations — The current AI landscape and key tools',
    ),
    paragraph(
      isJP
        ? 'Week 2: プロンプトエンジニアリング — 効果的なAIとのコミュニケーション'
        : 'Week 2: Prompt Engineering — Communicating effectively with AI',
    ),
    paragraph(
      isJP
        ? 'Week 3: 画像生成とクリエイティブAI — ビジュアルコンテンツの作成'
        : 'Week 3: Image Generation & Creative AI — Creating visual content',
    ),
    paragraph(
      isJP
        ? 'Week 4: ワークフロー自動化 — 業務プロセスの効率化'
        : 'Week 4: Workflow Automation — Streamlining your processes',
    ),
    paragraph(
      isJP
        ? 'Week 5: カスタムAIアシスタント — パーソナライズされたAIソリューション'
        : 'Week 5: Custom AI Assistants — Building personalized AI solutions',
    ),
    divider(),
    paragraph(
      isJP
        ? 'カリキュラムをダウンロード：'
        : 'Download the course curriculum:',
    ),
    ctaButton({
      href: downloadUrlEN,
      label: isJP ? '英語版をダウンロード' : 'Download English Version',
    }),
    ctaButton({
      href: downloadUrlJP,
      label: isJP ? '日本語版をダウンロード' : 'Download Japanese Version',
    }),
    divider(),
    paragraph(
      isJP
        ? 'ご質問がございましたら、ryan@honuvibe.ai までお気軽にお問い合わせください。'
        : 'Questions? Reach us at ryan@honuvibe.ai — we\'re happy to help.',
    ),
  ].join('');

  await sendEmail({
    to: email,
    subject: isJP
      ? '【HonuVibe.AI】AI Mastery コースへようこそ'
      : 'Welcome to AI Mastery — HonuVibe.AI × Vertice Society',
    html: baseLayout({
      locale,
      preheader: isJP ? 'AI Masteryへようこそ' : 'Welcome to AI Mastery!',
      body,
    }),
  });
}

export async function sendVerticeLeadAdminNotification(
  data: VerticeLeadEmailData,
): Promise<void> {
  const adminEmail = getAdminEmail();
  if (!adminEmail) return;

  const levelLabels: Record<string, string> = {
    beginner: 'Beginner',
    intermediate: 'Intermediate',
    advanced: 'Advanced',
  };

  const body = [
    accentBanner(data.isReturning ? 'Vertice Lead Updated' : 'New Vertice Society Lead'),
    detailsTable([
      { label: 'Name', value: data.fullName },
      { label: 'Email', value: data.email },
      { label: 'AI Level', value: levelLabels[data.aiLevel] ?? data.aiLevel },
      { label: 'Interests', value: data.interests.join(', ') },
      { label: 'Locale', value: data.locale },
      { label: 'Returning', value: data.isReturning ? 'Yes (updated)' : 'No (new)' },
    ]),
    divider(),
    heading('Why They Want to Study AI'),
    paragraph(data.whyStudy),
  ].join('');

  await sendEmail({
    to: adminEmail,
    subject: `[Vertice] ${data.isReturning ? 'Updated' : 'New'} lead: ${data.fullName}`,
    html: baseLayout({ locale: 'en', body }),
    replyTo: data.email,
  });
}

// ─── 9. Student Welcome ──────────────────────────────────────

export async function sendStudentWelcomeEmail(data: StudentWelcomeEmailData): Promise<void> {
  const { locale, fullName, email, actionLink, type } = data;
  const isJP = locale === 'ja';
  const isNew = type === 'new';

  const body = [
    accentBanner(
      isJP ? 'HonuVibe.AIへようこそ！' : 'Welcome to HonuVibe.AI!',
    ),
    heading(
      isJP
        ? `${fullName} さん、ようこそ！`
        : `Welcome, ${fullName}!`,
    ),
    paragraph(
      isJP
        ? isNew
          ? 'HonuVibe.AIの学習プラットフォームへのアクセスが付与されました。下のボタンからパスワードを設定して、ダッシュボードにアクセスしてください。'
          : 'コースへの登録が完了しました。下のボタンからダッシュボードにアクセスできます。'
        : isNew
          ? "You've been granted access to the HonuVibe.AI learning platform. Click below to set your password and access your dashboard."
          : "You've been enrolled in a course. Click below to access your student dashboard.",
    ),
    ctaButton({
      href: actionLink,
      label: isJP
        ? isNew ? 'パスワードを設定する' : 'ダッシュボードへ'
        : isNew ? 'Set Your Password' : 'Go to Dashboard',
    }),
    divider(),
    paragraph(
      isJP
        ? 'ご不明な点はお気軽にお問い合わせください。'
        : 'If you have any questions, feel free to reach out.',
    ),
  ].join('');

  await sendEmail({
    to: email,
    subject: isJP
      ? '【HonuVibe.AI】アカウントのご案内'
      : 'Welcome to HonuVibe.AI — Account Ready',
    html: baseLayout({
      locale,
      preheader: isJP ? 'HonuVibe.AIへようこそ' : 'Your HonuVibe.AI account is ready',
      body,
    }),
  });
}

export async function sendStudentWelcomeAdminNotification(data: {
  fullName: string;
  email: string;
  type: 'new' | 'existing';
  courseTitle?: string;
  notes?: string;
  emailSent: boolean;
}): Promise<void> {
  const adminEmail = getAdminEmail();
  if (!adminEmail) return;

  const rows: { label: string; value: string }[] = [
    { label: 'Name', value: data.fullName },
    { label: 'Email', value: data.email },
    { label: 'Account', value: data.type === 'new' ? 'New (created)' : 'Existing (found)' },
    { label: 'Email sent', value: data.emailSent ? 'Yes' : 'No' },
  ];

  if (data.courseTitle) rows.push({ label: 'Enrolled in', value: data.courseTitle });
  if (data.notes) rows.push({ label: 'Notes', value: data.notes });

  const body = [
    accentBanner('[Admin] Manual Student Added'),
    detailsTable(rows),
  ].join('');

  await sendEmail({
    to: adminEmail,
    subject: `[Students] ${data.fullName} added manually`,
    html: baseLayout({ locale: 'en', body }),
  });
}
