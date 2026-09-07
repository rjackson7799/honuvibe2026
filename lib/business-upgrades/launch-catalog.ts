import type { BusinessUpgradeProjectInput, BusinessUpgradeProjectStepInput } from './schemas';

export type LaunchCatalogStep = Omit<
  BusinessUpgradeProjectStepInput,
  'contentItemId' | 'workbenchScenarioId'
> & {
  contentSlug?: string;
};

export type LaunchCatalogProject = {
  project: Omit<BusinessUpgradeProjectInput, 'id' | 'steps'>;
  steps: LaunchCatalogStep[];
};

export const BUSINESS_UPGRADE_LAUNCH_CATALOG: LaunchCatalogProject[] = [
  {
    project: {
      slug: 'improve-customer-inquiry-follow-up',
      titleEn: 'Improve Customer Inquiry Follow-Up',
      titleJa: '顧客からの問い合わせ対応を改善する',
      descriptionEn:
        'Build a practical response system for new inquiries so customers hear back faster and each follow-up is consistent.',
      descriptionJa:
        '新しい問い合わせにすばやく一貫して対応できる、実践的な返信・フォローアップの仕組みを作ります。',
      outcomeEn: 'Faster, more consistent responses to prospective customers.',
      outcomeJa: '見込み顧客への返信がより速く、一貫したものになります。',
      deliverableEn: 'A reusable inquiry response kit and follow-up checklist.',
      deliverableJa: '再利用できる問い合わせ返信集とフォローアップチェックリスト。',
      metricLabelEn: 'Average minutes to first helpful response',
      metricLabelJa: '最初の有益な返信までの平均時間（分）',
      metricUnit: 'minutes',
      metricValueType: 'minutes',
      metricMin: 0,
      metricMax: 10080,
      improvementDirection: 'decrease',
      goalCodes: ['improve_customer_experience', 'increase_revenue'],
      workModelCodes: ['small_business', 'solopreneur', 'employed_professional', 'team_leader'],
      industryCodes: null,
      minConfidence: 'beginner',
      maxConfidence: 'advanced',
      estimatedDays: 7,
      totalMinutes: 100,
      featured: true,
      jpNeedsReview: true,
    },
    steps: [
      {
        sortOrder: 1,
        stepType: 'measurement',
        measurementKind: 'baseline',
        titleEn: 'Measure your current response time',
        titleJa: '現在の返信時間を測定する',
        instructionsEn:
          'Review your five most recent inquiries. Record the average number of minutes between receiving each inquiry and sending the first genuinely helpful reply.',
        instructionsJa:
          '直近5件の問い合わせを確認し、受信してから最初の有益な返信を送るまでの平均時間を分単位で記録してください。',
        estimatedMinutes: 15,
        required: true,
      },
      {
        sortOrder: 2,
        stepType: 'vault',
        titleEn: 'Learn a reusable prompting structure',
        titleJa: '再利用できるプロンプト構成を学ぶ',
        instructionsEn:
          'Open the Prompt Starter Kit and note the context, task, constraints, and output-format pattern you can reuse for customer replies.',
        instructionsJa:
          'プロンプトスターターキットを開き、顧客への返信に再利用できる「背景・タスク・制約・出力形式」の構成を確認してください。',
        contentSlug: 'prompt-starter-kit',
        estimatedMinutes: 15,
        required: true,
      },
      {
        sortOrder: 3,
        stepType: 'action',
        titleEn: 'Map your five most common inquiries',
        titleJa: 'よくある問い合わせを5種類に整理する',
        instructionsEn:
          'List the five questions customers ask most often. For each one, identify the facts a useful reply must include and the next action you want the customer to take.',
        instructionsJa:
          '顧客からよく聞かれる質問を5つ挙げ、それぞれについて、返信に必要な情報と顧客に取ってほしい次の行動を整理してください。',
        estimatedMinutes: 20,
        required: true,
      },
      {
        sortOrder: 4,
        stepType: 'action',
        titleEn: 'Create and test your response kit',
        titleJa: '返信集を作成してテストする',
        instructionsEn:
          'Draft one editable response for each inquiry type. Test every response with a realistic example, check the facts and tone, then save the approved versions where your team can reach them.',
        instructionsJa:
          '各問い合わせタイプに対して編集可能な返信文を1つずつ作成します。実際の例で内容・事実・トーンを確認し、承認した文面を使いやすい場所に保存してください。',
        estimatedMinutes: 35,
        required: true,
      },
      {
        sortOrder: 5,
        stepType: 'measurement',
        measurementKind: 'result',
        titleEn: 'Measure the next five inquiries',
        titleJa: '次の5件の問い合わせを測定する',
        instructionsEn:
          'Use the response kit for your next five inquiries and record the new average number of minutes to the first helpful response.',
        instructionsJa:
          '次の5件の問い合わせで返信集を使用し、最初の有益な返信までの新しい平均時間を分単位で記録してください。',
        estimatedMinutes: 15,
        required: true,
      },
    ],
  },
  {
    project: {
      slug: 'publish-one-week-useful-content',
      titleEn: 'Publish One Week of Useful Content',
      titleJa: '役立つコンテンツを1週間分公開する',
      descriptionEn:
        'Turn one clear audience problem into a small batch of useful posts you can confidently publish this week.',
      descriptionJa:
        '顧客が抱える一つの課題をもとに、今週自信を持って公開できる実用的な投稿をまとめて作ります。',
      outcomeEn: 'A repeatable content process and a week of published material.',
      outcomeJa: '再現可能なコンテンツ作成手順と、1週間分の公開済みコンテンツ。',
      deliverableEn: 'Three published posts plus a reusable five-post content outline.',
      deliverableJa: '公開済み投稿3本と、再利用できる5本分のコンテンツ構成案。',
      metricLabelEn: 'Useful posts published in seven days',
      metricLabelJa: '7日間に公開した有益な投稿数',
      metricUnit: 'posts',
      metricValueType: 'number',
      metricMin: 0,
      metricMax: 100,
      improvementDirection: 'increase',
      goalCodes: ['build_visibility', 'increase_revenue'],
      workModelCodes: ['small_business', 'solopreneur', 'employed_professional', 'team_leader'],
      industryCodes: null,
      minConfidence: 'beginner',
      maxConfidence: 'advanced',
      estimatedDays: 7,
      totalMinutes: 120,
      featured: true,
      jpNeedsReview: true,
    },
    steps: [
      {
        sortOrder: 1,
        stepType: 'measurement',
        measurementKind: 'baseline',
        titleEn: 'Record last week’s publishing baseline',
        titleJa: '先週の公開数を記録する',
        instructionsEn: 'Count the useful posts, articles, or newsletters you published during the previous seven days.',
        instructionsJa: '過去7日間に公開した有益な投稿、記事、ニュースレターの本数を数えてください。',
        estimatedMinutes: 5,
        required: true,
      },
      {
        sortOrder: 2,
        stepType: 'vault',
        titleEn: 'Review the AI content workflow',
        titleJa: 'AIコンテンツ作成の流れを確認する',
        instructionsEn:
          'Study the social content guide. Focus on audience relevance, useful specificity, human review, and adapting one idea into several formats.',
        instructionsJa:
          'SNSコンテンツ作成ガイドを確認し、対象者との関連性、具体性、人による確認、一つのアイデアを複数形式に展開する方法に注目してください。',
        contentSlug: 'ai-content-creation-social-media',
        estimatedMinutes: 20,
        required: true,
      },
      {
        sortOrder: 3,
        stepType: 'action',
        titleEn: 'Choose one problem and five angles',
        titleJa: '一つの課題と5つの切り口を決める',
        instructionsEn:
          'Choose one problem your audience actively wants to solve. Create five angles: a quick win, a common mistake, a short story, a checklist, and a practical example.',
        instructionsJa:
          '対象者が解決したい課題を一つ選び、「すぐできる改善」「よくある間違い」「短いストーリー」「チェックリスト」「実例」の5つの切り口を作ってください。',
        estimatedMinutes: 25,
        required: true,
      },
      {
        sortOrder: 4,
        stepType: 'action',
        titleEn: 'Draft five, review three, publish three',
        titleJa: '5本作成し、3本確認して公開する',
        instructionsEn:
          'Use AI to draft all five pieces. Add your own examples and point of view, verify claims, then publish the strongest three on the channels your audience already uses.',
        instructionsJa:
          'AIで5本の下書きを作り、自分の実例や視点を加え、内容を確認します。その中から最も良い3本を、対象者が利用しているチャネルで公開してください。',
        estimatedMinutes: 60,
        required: true,
      },
      {
        sortOrder: 5,
        stepType: 'measurement',
        measurementKind: 'result',
        titleEn: 'Record what you published',
        titleJa: '公開した本数を記録する',
        instructionsEn: 'Enter the number of useful pieces you published during this seven-day project.',
        instructionsJa: 'この7日間のプロジェクトで公開した有益なコンテンツの本数を入力してください。',
        estimatedMinutes: 10,
        required: true,
      },
    ],
  },
  {
    project: {
      slug: 'turn-meetings-into-action-plans',
      titleEn: 'Turn Meetings Into Clear Action Plans',
      titleJa: '会議を明確なアクションプランに変える',
      descriptionEn:
        'Create a consistent AI-assisted meeting process that produces decisions, owners, and next steps shortly after each meeting.',
      descriptionJa:
        '会議後すぐに決定事項、担当者、次のステップを整理できる、一貫したAI活用プロセスを作ります。',
      outcomeEn: 'Less time spent rewriting notes and fewer unclear follow-ups.',
      outcomeJa: '議事録の書き直し時間を減らし、曖昧なフォローアップを防ぎます。',
      deliverableEn: 'A tested meeting-to-action template and review checklist.',
      deliverableJa: '実際にテストした会議アクションテンプレートと確認チェックリスト。',
      metricLabelEn: 'Minutes spent producing follow-up after a meeting',
      metricLabelJa: '会議後のフォローアップ作成にかかる時間（分）',
      metricUnit: 'minutes',
      metricValueType: 'minutes',
      metricMin: 0,
      metricMax: 1440,
      improvementDirection: 'decrease',
      goalCodes: ['save_time'],
      workModelCodes: ['small_business', 'solopreneur', 'employed_professional', 'team_leader'],
      industryCodes: null,
      minConfidence: 'beginner',
      maxConfidence: 'advanced',
      estimatedDays: 7,
      totalMinutes: 75,
      featured: false,
      jpNeedsReview: true,
    },
    steps: [
      {
        sortOrder: 1,
        stepType: 'measurement',
        measurementKind: 'baseline',
        titleEn: 'Time your current follow-up process',
        titleJa: '現在のフォローアップ作業時間を測る',
        instructionsEn:
          'Using a recent typical meeting, record how many minutes you spent cleaning notes, identifying actions, and sending the follow-up.',
        instructionsJa:
          '最近の一般的な会議を一つ選び、メモの整理、アクションの抽出、フォローアップ送信にかかった合計時間を記録してください。',
        estimatedMinutes: 10,
        required: true,
      },
      {
        sortOrder: 2,
        stepType: 'vault',
        titleEn: 'Set up the meeting notes template',
        titleJa: '会議メモテンプレートを準備する',
        instructionsEn:
          'Open the AI Meeting Notes Template and adapt its agenda, decisions, action items, owners, and due-date sections to your work.',
        instructionsJa:
          'AI会議メモテンプレートを開き、議題、決定事項、アクション項目、担当者、期限の各欄を自分の業務に合わせて調整してください。',
        contentSlug: 'ai-meeting-notes-template-japanese',
        estimatedMinutes: 20,
        required: true,
      },
      {
        sortOrder: 3,
        stepType: 'action',
        titleEn: 'Write your safe summarizing prompt',
        titleJa: '安全な要約プロンプトを作る',
        instructionsEn:
          'Create a prompt that extracts decisions, action items, owners, due dates, and unresolved questions. Include a rule that the AI must label missing information instead of inventing it.',
        instructionsJa:
          '決定事項、アクション項目、担当者、期限、未解決の質問を抽出するプロンプトを作ります。不明な情報を推測せず「不明」と示すルールも加えてください。',
        estimatedMinutes: 20,
        required: true,
      },
      {
        sortOrder: 4,
        stepType: 'action',
        titleEn: 'Use and review it in three meetings',
        titleJa: '3回の会議で使用して確認する',
        instructionsEn:
          'Use the workflow for three meetings. Before sharing each result, verify names, commitments, dates, confidential information, and anything the AI marked as uncertain.',
        instructionsJa:
          '3回の会議でこの手順を使用します。共有前に、氏名、約束事項、日付、機密情報、AIが不確かと示した内容を必ず確認してください。',
        estimatedMinutes: 15,
        required: true,
      },
      {
        sortOrder: 5,
        stepType: 'measurement',
        measurementKind: 'result',
        titleEn: 'Time the improved process',
        titleJa: '改善後の作業時間を測る',
        instructionsEn:
          'For the third meeting, record the minutes from the meeting ending until the reviewed follow-up is ready to send.',
        instructionsJa:
          '3回目の会議で、会議終了から確認済みのフォローアップが送信可能になるまでの時間を分単位で記録してください。',
        estimatedMinutes: 10,
        required: true,
      },
    ],
  },
  {
    project: {
      slug: 'create-decision-ready-research-brief',
      titleEn: 'Create a Decision-Ready Research Brief',
      titleJa: '意思決定に使えるリサーチブリーフを作る',
      descriptionEn:
        'Use AI-assisted research to turn a real business or career question into a concise, sourced brief with a clear recommendation.',
      descriptionJa:
        '実際のビジネスやキャリア上の問いを、根拠と明確な提案を含む簡潔なリサーチブリーフにまとめます。',
      outcomeEn: 'Faster research that is easier to verify, explain, and act on.',
      outcomeJa: '確認・説明・実行がしやすい、より速いリサーチプロセス。',
      deliverableEn: 'A two-page research brief with sources, options, risks, and a recommendation.',
      deliverableJa: '情報源、選択肢、リスク、提案を含む2ページのリサーチブリーフ。',
      metricLabelEn: 'Minutes required to produce a decision-ready brief',
      metricLabelJa: '意思決定用ブリーフの作成にかかる時間（分）',
      metricUnit: 'minutes',
      metricValueType: 'minutes',
      metricMin: 0,
      metricMax: 10080,
      improvementDirection: 'decrease',
      goalCodes: ['strengthen_career', 'save_time'],
      workModelCodes: ['small_business', 'solopreneur', 'employed_professional', 'team_leader'],
      industryCodes: null,
      minConfidence: 'beginner',
      maxConfidence: 'advanced',
      estimatedDays: 10,
      totalMinutes: 130,
      featured: false,
      jpNeedsReview: true,
    },
    steps: [
      {
        sortOrder: 1,
        stepType: 'measurement',
        measurementKind: 'baseline',
        titleEn: 'Estimate your current research time',
        titleJa: '現在のリサーチ時間を見積もる',
        instructionsEn:
          'Choose a real decision you need to make. Record how many minutes a comparable, well-sourced research brief normally takes you to produce.',
        instructionsJa:
          '実際に判断が必要なテーマを一つ選び、同程度の根拠あるリサーチブリーフを通常作成するのにかかる時間を分単位で記録してください。',
        estimatedMinutes: 10,
        required: true,
      },
      {
        sortOrder: 2,
        stepType: 'vault',
        titleEn: 'Learn a source-grounded research workflow',
        titleJa: '情報源に基づくリサーチ手順を学ぶ',
        instructionsEn:
          'Review the NotebookLM research guide. Note how to organize source material, separate source facts from interpretation, and preserve citations.',
        instructionsJa:
          'NotebookLMリサーチガイドを確認し、情報源の整理、事実と解釈の区別、引用の保持方法を学んでください。',
        contentSlug: 'notebooklm-research-guide',
        estimatedMinutes: 25,
        required: true,
      },
      {
        sortOrder: 3,
        stepType: 'vault',
        titleEn: 'Compare an AI search workflow',
        titleJa: 'AI検索の手順を比較する',
        instructionsEn:
          'Review the Perplexity research lesson and identify when to use broad discovery, primary-source verification, and follow-up searches.',
        instructionsJa:
          'Perplexityのリサーチ教材を確認し、幅広い情報収集、一次情報の確認、追加検索をどの場面で使うか整理してください。',
        contentSlug: 'perplexity-deep-research',
        estimatedMinutes: 20,
        required: true,
      },
      {
        sortOrder: 4,
        stepType: 'action',
        titleEn: 'Produce and challenge the brief',
        titleJa: 'ブリーフを作成し、内容を検証する',
        instructionsEn:
          'Create a two-page brief covering the question, evidence, two or three options, tradeoffs, risks, and your recommendation. Open every critical source and challenge the strongest counterargument before finalizing.',
        instructionsJa:
          '問い、根拠、2〜3の選択肢、トレードオフ、リスク、提案を含む2ページのブリーフを作成します。重要な情報源をすべて開き、最も強い反対意見も検討してから完成させてください。',
        estimatedMinutes: 60,
        required: true,
      },
      {
        sortOrder: 5,
        stepType: 'measurement',
        measurementKind: 'result',
        titleEn: 'Record the completed research time',
        titleJa: '完成までのリサーチ時間を記録する',
        instructionsEn:
          'Enter the total minutes spent from defining the question through completing the verified two-page brief.',
        instructionsJa:
          '問いを決めてから、確認済みの2ページのブリーフを完成させるまでにかかった合計時間を入力してください。',
        estimatedMinutes: 15,
        required: true,
      },
    ],
  },
];
