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
  StudentOnboardingEmailData,
  VerticeLeadEmailData,
  StudentProfileEmailData,
  SurveyAdminWithProfileData,
  PaymentLinkEmailData,
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
  const { locale, fullName, email, actionLink, type, courseTitle, surveyUrl } = data;
  const isJP = locale === 'ja';
  const isNew = type === 'new';

  const body = [
    heading(
      isJP
        ? `${fullName} さん、ようこそ！`
        : `Hi ${fullName},`,
    ),
    paragraph(
      isJP
        ? 'HonuVibe.AIへようこそ！一緒に学べることをとても楽しみにしています。'
        : "Welcome to HonuVibe.AI! We're excited to have you join us.",
    ),

    // Course block — only if enrolled
    ...(courseTitle
      ? [
          divider(),
          detailsTable([
            {
              label: isJP ? 'ご登録コース' : 'Your Class',
              value: courseTitle,
            },
          ]),
        ]
      : []),

    divider(),

    // Login instructions
    heading(isJP ? 'はじめ方' : 'Getting Started'),
    paragraph(
      isJP
        ? isNew
          ? 'アカウントの準備ができました。下のボタンからパスワードを設定して、学習ダッシュボードにアクセスしてください。'
          : 'アカウントにログインして、コース教材にアクセスしてください。'
        : isNew
          ? 'Your account is ready. Click below to set your password and access your student dashboard.'
          : 'Your account is ready. Click below to access your student dashboard.',
    ),
    ctaButton({
      href: actionLink,
      label: isJP
        ? isNew ? 'パスワードを設定する' : 'ダッシュボードへ'
        : isNew ? 'Set Your Password' : 'Go to Dashboard',
    }),
    ...(isNew
      ? [
          paragraph(
            isJP
              ? 'このリンクは24時間有効です。期限が切れた場合は、ログインページの「パスワードをお忘れですか？」からリセットできます。'
              : 'This link expires in 24 hours. If it expires, use "Forgot Password" on the login page to get a new one.',
          ),
        ]
      : []),

    // Survey block — only if assigned
    ...(surveyUrl
      ? [
          divider(),
          heading(isJP ? '授業の前に' : 'Before Your First Class'),
          paragraph(
            isJP
              ? 'あなたのことをもっとよく知ることで、より充実した学習体験を提供できます。アンケートにご協力をお願いします。'
              : "We'd love to learn a bit about you so we can make this experience as valuable as possible.",
          ),
          ctaButton({
            href: surveyUrl,
            label: isJP ? '受講前アンケートに答える' : 'Complete Your Pre-Course Survey',
          }),
        ]
      : []),

    divider(),

    paragraph(
      isJP
        ? `ご質問は <a href="mailto:help@honuvibe.com" style="color:#5eaaa8;text-decoration:none;">help@honuvibe.com</a> までお気軽にどうぞ。`
        : `Questions? Email us at <a href="mailto:help@honuvibe.com" style="color:#5eaaa8;text-decoration:none;">help@honuvibe.com</a> — we're happy to help.`,
    ),
    paragraph(
      isJP
        ? 'またクラスでお会いしましょう、<br>HonuVibe.AI チームより'
        : 'See you in class,<br>The HonuVibe.AI Team',
    ),
  ].join('');

  await sendEmail({
    to: email,
    subject: isJP
      ? `【HonuVibe.AI】ようこそ、${fullName} さん！`
      : `Welcome to HonuVibe.AI, ${fullName} — you're in!`,
    html: baseLayout({
      locale,
      preheader: isJP ? 'HonuVibe.AIへようこそ！' : "Welcome to HonuVibe.AI — you're in!",
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

// ─── Student AI Study Profile ────────────────────────────────

export async function sendStudentProfileEmail(data: StudentProfileEmailData): Promise<void> {
  const { fullName, email, levelLabel, levelDescription, recommendedTools, suggestedProjects, aiForYourWork, learningPath, surveySummary } = data;

  // Student email is always Japanese only
  const surveySummarySection = surveySummary ? [
    divider(),
    heading('ご回答の概要'),
    detailsTable([
      { label: '職業・バックグラウンド', value: surveySummary.professional_background },
      { label: '日常の役割', value: surveySummary.role_description },
      { label: 'AIの理解度', value: surveySummary.ai_knowledge_level },
      { label: '使用中のAIツール', value: surveySummary.ai_tools_used.join(', ') || '—' },
      { label: 'AIを学ぶ理由', value: surveySummary.learning_reasons.join(', ') },
      { label: 'AIに任せたいこと', value: surveySummary.ai_help_with.join(', ') },
      ...(surveySummary.specific_interests ? [{ label: 'その他のご関心', value: surveySummary.specific_interests }] : []),
    ]),
  ].join('') : '';

  const body = [
    accentBanner('あなたのAI学習プロフィールができました'),
    heading(`${fullName} さん、アンケートへのご回答ありがとうございます！`),
    paragraph('あなたの回答をもとに、パーソナライズされたAI学習プロフィールを作成しました。コースをより有意義なものにするために、ぜひご活用ください。'),
    surveySummarySection,
    divider(),
    heading('あなたのAIレベル'),
    accentBanner(levelLabel),
    paragraph(levelDescription),
    divider(),
    heading('おすすめのAIツール'),
    paragraph('あなたの目標と経験レベルに合わせた、特におすすめの3つのツールです。'),
    detailsTable(recommendedTools.map((t) => ({ label: t.name, value: t.reason }))),
    divider(),
    heading('AIがあなたの仕事・関心をどう助けるか'),
    paragraph(aiForYourWork),
    divider(),
    heading('スキルアップのためのプロジェクトアイデア'),
    paragraph('あなたの背景と目標に合わせた、実践的なプロジェクトアイデアです。'),
    detailsTable(suggestedProjects.map((p) => ({ label: p.title, value: p.description }))),
    divider(),
    heading('あなたへの学習アドバイス'),
    paragraph(learningPath),
  ].join('');

  await sendEmail({
    to: email,
    subject: 'あなたのAI学習プロフィール — AI Essentials',
    html: baseLayout({
      locale: 'ja',
      preheader: 'あなた専用のAI学習プロフィールをご覧ください',
      body,
      lightFooter: true,
    }),
  });
}

// ─── Survey Admin Notification (with AI Profile) ────────────

export async function sendSurveyAdminNotificationWithProfile(data: SurveyAdminWithProfileData): Promise<void> {
  const resend = getResendClient();
  if (!resend || data.recipients.length === 0) return;

  const { studentName, studentEmail, surveyData, levelLabel, levelDescription, recommendedTools, suggestedProjects, aiForYourWork, learningPath } = data;

  const tools = Array.isArray(surveyData.ai_tools_used) ? (surveyData.ai_tools_used as string[]).join(', ') : '—';
  const reasons = Array.isArray(surveyData.learning_reasons) ? (surveyData.learning_reasons as string[]).join(', ') : '—';
  const helpWith = Array.isArray(surveyData.ai_help_with) ? (surveyData.ai_help_with as string[]).join(', ') : '—';

  const body = [
    accentBanner('New AI Essentials Survey Response / 新しいアンケート回答'),
    heading('Student Survey Answers / 受講生アンケート回答'),
    detailsTable([
      { label: 'Name / 氏名', value: String(surveyData.name ?? '—') },
      ...(studentEmail ? [{ label: 'Email / メール', value: studentEmail }] : []),
      { label: 'Background / バックグラウンド', value: String(surveyData.professional_background ?? '—') },
      { label: 'Role / 役割', value: String(surveyData.role_description ?? '—') },
      { label: 'AI Knowledge Level / AIの理解度', value: String(surveyData.ai_knowledge_level ?? '—') },
      { label: 'Tools Used / 使用ツール', value: tools },
      { label: 'Usage Frequency / 使用頻度', value: String(surveyData.ai_usage_frequency ?? '—') },
      { label: 'Why Learning AI / 学習理由', value: reasons },
      { label: 'Wants AI to Help With / AIに任せたいこと', value: helpWith },
      { label: 'Success Looks Like / 成功のイメージ', value: String(surveyData.success_definition ?? '—') },
      { label: 'Current Feeling / 現在の気持ち', value: String(surveyData.current_feeling ?? '—') },
      { label: 'Used Zoom Before / Zoom使用経験', value: String(surveyData.used_zoom_before ?? '—') },
      ...(surveyData.specific_interests ? [{ label: 'Additional Thoughts / その他のご関心', value: String(surveyData.specific_interests) }] : []),
    ]),
    divider(),
    heading('AI-Generated Student Profile / AI生成プロフィール'),
    accentBanner(`${levelLabel}`),
    paragraph(levelDescription),
    divider(),
    heading('Recommended Tools / おすすめのAIツール'),
    detailsTable(recommendedTools.map((t) => ({ label: t.name, value: t.reason }))),
    divider(),
    heading('How AI Can Help This Student / AIが貢献できること'),
    paragraph(aiForYourWork),
    divider(),
    heading('Suggested Projects / おすすめプロジェクト'),
    detailsTable(suggestedProjects.map((p) => ({ label: p.title, value: p.description }))),
    divider(),
    heading('Personalized Learning Path / 学習アドバイス'),
    paragraph(learningPath),
  ].join('');

  try {
    const { error } = await resend.emails.send({
      from: getFromAddress(),
      to: data.recipients,
      subject: `[AI Essentials] New survey + AI profile — ${studentName}`,
      html: baseLayout({ locale: 'en', body }),
    });
    if (error) console.error('[SurveyAdminNotification] Send failed:', error.message);
  } catch (err) {
    console.error('[SurveyAdminNotification] Unexpected error:', err);
  }
}

// ─── Student Onboarding (self-signup confirmation) ───────────

export async function sendStudentOnboardingEmail(data: StudentOnboardingEmailData): Promise<void> {
  const { locale, fullName, email, dashboardUrl } = data;
  const isJP = locale === 'ja';
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://honuvibe.ai';

  const body = [
    accentBanner(isJP ? 'HonuVibe.AIへようこそ！' : "Welcome to HonuVibe.AI — you're in!"),
    heading(isJP ? `${fullName}さん、ようこそ！` : `Welcome, ${fullName}!`),
    paragraph(
      isJP
        ? 'メールの確認が完了しました。HonuVibe.AIへようこそ！あなたの学習プラットフォームの準備ができています。'
        : "Your email has been confirmed. Your HonuVibe.AI learning platform is ready — here's how to get started.",
    ),
    divider(),
    heading(isJP ? '次のステップ' : 'Get Started'),
    detailsTable([
      {
        label: isJP ? 'コース' : 'Courses',
        value: isJP
          ? `<a href="${siteUrl}/learn" style="color:#5eaaa8;text-decoration:none;">ライブコースを見る →</a>`
          : `<a href="${siteUrl}/learn" style="color:#5eaaa8;text-decoration:none;">Browse live courses →</a>`,
      },
      {
        label: isJP ? 'The Vault' : 'The Vault',
        value: isJP
          ? `<a href="${dashboardUrl.replace('/dashboard', '/vault')}" style="color:#5eaaa8;text-decoration:none;">プレミアム動画ライブラリ →</a>`
          : `<a href="${dashboardUrl.replace('/dashboard', '/vault')}" style="color:#5eaaa8;text-decoration:none;">Premium video library →</a>`,
      },
      {
        label: isJP ? 'ライブラリ' : 'Library',
        value: isJP
          ? `<a href="${dashboardUrl.replace('/dashboard', '/library')}" style="color:#5eaaa8;text-decoration:none;">無料動画を見る →</a>`
          : `<a href="${dashboardUrl.replace('/dashboard', '/library')}" style="color:#5eaaa8;text-decoration:none;">Free learning videos →</a>`,
      },
    ]),
    divider(),
    ctaButton({
      href: dashboardUrl,
      label: isJP ? 'ダッシュボードへ →' : 'Go to Dashboard →',
    }),
    divider(),
    paragraph(
      isJP
        ? `ご質問は <a href="mailto:help@honuvibe.com" style="color:#5eaaa8;text-decoration:none;">help@honuvibe.com</a> までお気軽にどうぞ。`
        : `Questions? Email us at <a href="mailto:help@honuvibe.com" style="color:#5eaaa8;text-decoration:none;">help@honuvibe.com</a> — we're happy to help.`,
    ),
    paragraph(
      isJP
        ? 'またクラスでお会いしましょう、<br>HonuVibe.AI チームより'
        : 'See you in class,<br>The HonuVibe.AI Team',
    ),
  ].join('');

  await sendEmail({
    to: email,
    subject: isJP
      ? `【HonuVibe.AI】ようこそ、${fullName}さん！`
      : `Welcome to HonuVibe.AI, ${fullName} — you're in!`,
    html: baseLayout({
      locale,
      preheader: isJP ? 'HonuVibe.AIへようこそ！' : "You're in — your learning platform is ready.",
      body,
    }),
  });
}

// ─── Admin Payment Link ──────────────────────────────────────

export async function sendPaymentLinkEmail(data: PaymentLinkEmailData): Promise<void> {
  const { locale, email, fullName, courseTitle, paymentUrl, priceUsd } = data;
  const isJP = locale === 'ja';
  const price = `$${(priceUsd / 100).toLocaleString('en-US')}`;

  const body = [
    accentBanner(isJP ? '受講用お支払いリンク' : 'Your Enrollment Payment Link'),
    heading(isJP ? `${fullName}さん、こんにちは` : `Hi ${fullName},`),
    paragraph(
      isJP
        ? `<strong>${courseTitle}</strong> の受講お申し込み用お支払いリンクをお送りします。下のボタンから決済を完了して、お席を確保してください。`
        : `You've been invited to enroll in <strong>${courseTitle}</strong>. Use the button below to complete your payment and secure your spot.`,
    ),
    ctaButton({
      href: paymentUrl,
      label: isJP ? '支払いを完了する →' : 'Complete Payment →',
    }),
    detailsTable([
      { label: isJP ? 'コース' : 'Course', value: courseTitle },
      { label: isJP ? '金額' : 'Price', value: price },
      { label: isJP ? '通貨' : 'Currency', value: 'USD' },
    ]),
    divider(),
    paragraph(
      isJP
        ? 'このリンクの有効期限は23時間です。ご不明な点があれば、このメールに返信してください。'
        : 'This link expires in 23 hours. If you have any questions, reply to this email.',
    ),
  ].join('');

  const resend = getResendClient();
  if (!resend) return;

  const { error } = await resend.emails.send({
    from: getFromAddress(),
    to: email,
    subject: isJP
      ? `受講お支払いリンク — ${courseTitle}`
      : `Your enrollment link — ${courseTitle}`,
    html: baseLayout({ locale, body }),
  });

  if (error) console.error('[sendPaymentLinkEmail] Failed:', error.message);
}

// ─── Email Confirmation (admin-triggered resend) ───────────

export async function sendConfirmationEmail(data: {
  email: string;
  fullName: string | null;
  confirmLink: string;
  locale?: 'en' | 'ja';
}): Promise<void> {
  const { email, fullName, confirmLink, locale = 'en' } = data;
  const isJP = locale === 'ja';
  const name = fullName ?? (isJP ? 'お客様' : 'there');

  const body = [
    heading(isJP ? `${name}さん、こんにちは` : `Hi ${name},`),
    paragraph(
      isJP
        ? 'HonuVibe.AIのアカウントを有効にするには、以下のボタンをクリックしてメールアドレスを確認してください。'
        : 'Please confirm your email address to activate your HonuVibe.AI account.',
    ),
    ctaButton({
      href: confirmLink,
      label: isJP ? 'メールアドレスを確認 →' : 'Confirm Email Address →',
    }),
    divider(),
    paragraph(
      isJP
        ? 'このメールに心当たりがない場合は、無視していただいて結構です。'
        : 'If you did not create an account, you can safely ignore this email.',
    ),
  ].join('');

  await sendEmail({
    to: email,
    subject: isJP
      ? '【HonuVibe.AI】メールアドレスの確認'
      : 'Confirm your email — HonuVibe.AI',
    html: baseLayout({
      locale,
      preheader: isJP ? 'メールアドレスの確認' : 'Confirm your email to get started',
      body,
    }),
  });
}
