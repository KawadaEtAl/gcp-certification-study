import { useEffect, useState } from 'react';
import type { StepInsight } from '../types';
import { useIsMobile } from '../hooks/useIsMobile';

type NodeId = 'svc-trigger' | 'svc-container' | 'svc-scale' | 'job-trigger' | 'job-tasks' | 'job-exit';

interface NodeDetail {
  id: NodeId;
  order: number;
  badge: string;
  title: string;
  subtitle: string;
  explanation: string;
  kvPairs: { label: string; value: string; tone?: 'neutral' | 'allow' | 'deny' | 'warn' | 'info' }[];
  payloadTitle: string;
  sampleJson: Record<string, unknown>;
}

const NODE_DETAILS: Record<NodeId, NodeDetail> = {
  'svc-trigger': {
    id: 'svc-trigger',
    order: 1,
    badge: 'Cloud Run サービス・入口',
    title: 'HTTP リクエストによる起動（同期応答）',
    subtitle: 'ブラウザ・他 API・Pub/Sub Push・Cloud Tasks が HTTPS で呼び出す',
    explanation:
      'Cloud Run サービスは必ず固有の HTTPS URL を持ち、入口で `roles/run.invoker` と ID トークンを検証します。クライアントは HTTP レスポンス（200 OK など）を待つ前提の契約です。',
    kvPairs: [
      { label: '呼び出し元の具体例', value: '社内ポータル / 他 API / Pub/Sub Push / Cloud Tasks', tone: 'info' },
      { label: '入口の認証', value: '`roles/run.invoker` ＋ ID トークン（非公開時）' },
      { label: 'レスポンス契約', value: 'リクエストごとに HTTP ステータスを返す', tone: 'allow' },
    ],
    payloadTitle: 'サービス呼び出しの例',
    sampleJson: {
      model: 'Cloud Run Service',
      endpoint: 'https://week01-manual-api-xxxxx-an.a.run.app/read',
      timeoutMax: '最大 60 分（通常 API は数秒以内）',
    },
  },
  'svc-container': {
    id: 'svc-container',
    order: 2,
    badge: 'Cloud Run サービス・コンテナ契約',
    title: '`$PORT` で常時待ち受ける Web サーバー',
    subtitle: '起動時に指定ポート（既定 8080）でリッスンしないと Ready にならない',
    explanation:
      'サービス用コンテナは「起動してすぐ終了するスクリプト」ではなく、HTTP サーバーとして `$PORT` で待機し続ける必要があります。応答を返した後の裏スレッド処理は CPU が絞られ途中終了するため、重いバッチは不向きです。',
    kvPairs: [
      { label: '必須条件', value: '環境変数 `$PORT`（既定 8080）で HTTP リッスン', tone: 'warn' },
      { label: 'CPU 課金（既定）', value: 'リクエスト処理中のみ CPU 割り当て（応答後は絞られる）' },
      { label: '裏バッチが危険な理由', value: '応答後の非同期処理は停止・強制終了リスクあり', tone: 'deny' },
    ],
    payloadTitle: 'サービスのコンテナ契約',
    sampleJson: {
      contract: 'Listen on $PORT (default 8080)',
      readyCondition: 'Startup Probe がポート応答を確認して Ready',
      antiPattern: 'HTTP 202 を返した後に裏スレッドで 20 分処理する',
    },
  },
  'svc-scale': {
    id: 'svc-scale',
    order: 3,
    badge: 'Cloud Run サービス・伸縮と版管理',
    title: 'リビジョン管理とリクエスト数に応じた自動スケール',
    subtitle: '0 台〜max-instances まで自動伸縮し、複数リビジョンへトラフィック分割できる',
    explanation:
      'サービスは同時リクエスト数に応じてコンテナ台数を自動調整し、さらに v1 / v2 リビジョン間のカナリア切替（10% → 100%）や即時ロールバックを備えています。',
    kvPairs: [
      { label: 'スケーリング基準', value: '同時 HTTP リクエスト数 ÷ Concurrency', tone: 'info' },
      { label: 'リリース機能', value: 'リビジョン不変管理・トラフィック分割・タグ URL', tone: 'allow' },
      { label: '課金単位', value: 'リクエスト処理時間（min>=1 時はアイドル枠も課金）' },
    ],
    payloadTitle: 'サービス側の強み',
    sampleJson: {
      trafficSplitting: true,
      scaleToZero: true,
      idealWorkloads: ['REST / GraphQL API', 'Web UI バックエンド', '短時間 Webhook 受信'],
    },
  },
  'job-trigger': {
    id: 'job-trigger',
    order: 4,
    badge: 'Cloud Run ジョブ・起動契機',
    title: 'スケジュール／ワークフロー／手動による実行開始',
    subtitle: 'HTTP エンドポイントを持たず、「実行（Execution）」を開始して動かす',
    explanation:
      'ジョブは URL でリクエストを待ち受けるのではなく、Cloud Scheduler（毎晩 2 時）、Cloud Workflows、または `gcloud run jobs execute` で 1 回分の「Execution（実行）」を起動します。',
    kvPairs: [
      { label: '起動元の具体例', value: 'Cloud Scheduler / Cloud Workflows / 運用者の手動実行', tone: 'info' },
      { label: 'HTTP 公開 URL', value: 'なし（ポート 8080 待ち受け不要）', tone: 'allow' },
      { label: '実行権限', value: '起動主体に `roles/run.invoker`（ジョブ実行権限）' },
    ],
    payloadTitle: 'ジョブ起動のコマンド例',
    sampleJson: {
      model: 'Cloud Run Job',
      jobName: 'manual-index-nightly-job',
      trigger: 'Cloud Scheduler (0 2 * * *) or gcloud run jobs execute',
      httpPortRequired: false,
    },
  },
  'job-tasks': {
    id: 'job-tasks',
    order: 5,
    badge: 'Cloud Run ジョブ・並列処理',
    title: '複数タスク（Task 0..N）への自動分割と並列実行',
    subtitle: '`CLOUD_RUN_TASK_INDEX` で 1,000 件の PDF を 10 タスクへ分担並列処理',
    explanation:
      'ジョブの強みは、1 回の実行で `--tasks=10 --parallelism=5` のように配列タスクを並列起動できる点です。各コンテナには自動で `CLOUD_RUN_TASK_INDEX`（0〜9）と `CLOUD_RUN_TASK_COUNT`（10）が渡されるため、担当範囲を簡単に分けられます。',
    kvPairs: [
      { label: '並列化の仕組み', value: '`--tasks`（総数）× `--parallelism`（同時並列数）', tone: 'info' },
      { label: '分担用の環境変数', value: '`CLOUD_RUN_TASK_INDEX` / `CLOUD_RUN_TASK_COUNT`' },
      { label: '失敗時の挙動', value: '失敗したタスクだけ `--max-retries` 回まで自動再試行', tone: 'allow' },
    ],
    payloadTitle: 'タスク並列実行のイメージ',
    sampleJson: {
      execution: 'manual-index-nightly-job-x9k2p',
      tasks: 10,
      parallelism: 5,
      envInjected: { CLOUD_RUN_TASK_INDEX: '2', CLOUD_RUN_TASK_COUNT: '10' },
      retryScope: '失敗した Task 2 のみ自動リトライ（他 9 タスクは再実行しない）',
    },
  },
  'job-exit': {
    id: 'job-exit',
    order: 6,
    badge: 'Cloud Run ジョブ・完了と課金終了',
    title: '全タスクが `exit 0` で終了したら課金も即停止',
    subtitle: 'タスク単位で最大 24 時間まで実行可能。常駐 VM のようなアイドル課金ゼロ',
    explanation:
      '全タスクが終了コード `0` で完結すると Execution が「成功」で終わり、コンテナは即座に破棄されます。1 日 20 分しか動かないバッチなら、その 20 分の実行分しか課金されません。',
    kvPairs: [
      { label: '終了判定', value: 'プロセス終了コード `0`＝成功 / 非 `0`＝失敗', tone: 'allow' },
      { label: 'タイムアウト上限', value: 'タスクあたり最大 24 時間（既定 10 分）', tone: 'info' },
      { label: 'トラフィック分割', value: 'なし（HTTP 入口がないため）' },
    ],
    payloadTitle: 'ジョブ完了時の状態',
    sampleJson: {
      status: 'SUCCEEDED',
      completedTasks: '10 / 10 (exit code 0)',
      billingAfterExit: '$0（終了した瞬間に課金停止）',
      idealWorkloads: ['夜間 PDF 索引作成', 'DB マイグレーション', '月次レポート一括集計'],
    },
  },
};

const COMPARISON_ROWS = [
  {
    axis: '主な用途',
    service: 'Web API・Webhook・画面バックエンド（HTTP 応答あり）',
    job: '夜間バッチ・PDF 変換・集計・DB マイグレーション（やり切り）',
  },
  {
    axis: 'コンテナの契約',
    service: '`$PORT` で HTTP サーバーを常時リッスンし続ける',
    job: 'ポート待ち受け不要。処理完了で `exit 0` 終了',
  },
  {
    axis: '起動トリガー',
    service: 'HTTP リクエスト（ブラウザ / 他 API / Pub/Sub Push / Cloud Tasks）',
    job: 'Cloud Scheduler / Cloud Workflows / `gcloud run jobs execute`',
  },
  {
    axis: 'タイムアウト上限',
    service: '1 リクエストあたり最大 60 分',
    job: '1 タスクあたり最大 24 時間（既定 10 分）',
  },
  {
    axis: 'スケール・並列化',
    service: '同時リクエスト数に応じて 0〜max 台へ自動スケール',
    job: '`--tasks` と `--parallelism` で複数タスクを配列並列実行',
  },
  {
    axis: '失敗時の再試行',
    service: '呼び出し元（クライアント / Cloud Tasks 等）の責任',
    job: '失敗したタスク単位で `--max-retries` 回まで自動再試行',
  },
  {
    axis: 'リリース・切替',
    service: '不変リビジョン＋トラフィック分割（10% → 100%）＋即ロールバック',
    job: 'ジョブ定義を更新し、次回 Execution から新コンテナで実行',
  },
];

interface Part1Props {
  onStepInsightChange: (insight: StepInsight) => void;
}

export function Week02Part1ServiceVsJobViz({ onStepInsightChange }: Part1Props) {
  const isMobile = useIsMobile();
  const [activeId, setActiveId] = useState<NodeId>('job-tasks');
  const active = NODE_DETAILS[activeId];

  useEffect(() => {
    onStepInsightChange({
      stepNumber: active.order,
      totalSteps: Object.keys(NODE_DETAILS).length,
      badge: active.badge,
      title: active.title,
      subtitle: active.subtitle,
      explanation: active.explanation,
      kvPairs: active.kvPairs,
      payloadTitle: active.payloadTitle,
      payloadJson: JSON.stringify(active.sampleJson, null, 2),
    });
  }, [active, onStepInsightChange]);

  const strokeFor = (id: NodeId, base: string, activeColor: string) =>
    activeId === id ? activeColor : base;
  const widthFor = (id: NodeId) => (activeId === id ? 2.5 : 1.35);

  return (
    <div className="viz-workspace">
      <div className="canvas-card">
        <div className="canvas-toolbar">
          <span className="skeleton-hint">
            サービス（左/上）とジョブ（右/下）の各ボックスをタップして違いをインスペクタで確認
          </span>
        </div>

        <div className="skeleton-stack">
          <section className="skeleton-section">
            <div className="skeleton-section-head">
              <span className="skeleton-num-badge">1</span>
              <div>
                <h2 className="skeleton-section-title">
                  ライフサイクル骨格図：HTTP 待ち受け（サービス） vs 処理完結（ジョブ）
                </h2>
                <p className="skeleton-section-sub">
                  同じ Cloud Run でも「リクエストが来たら返す常駐契約」と「起動して終わったら解散する作業契約」はまったく別物です。
                </p>
              </div>
            </div>

            <div className="blueprint-stage skeleton-stage">
              {isMobile ? (
                <svg
                  className="blueprint-svg"
                  viewBox="0 0 380 556"
                  role="img"
                  aria-label="Cloud Run サービスとジョブのライフサイクル比較骨格図（モバイル）"
                >
                  <title>Cloud Run サービス vs ジョブ（モバイル）</title>
                  <defs>
                    <marker id="w2p1-arr-m" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                      <path d="M0 1l8 4-8 4z" fill="#64748b" />
                    </marker>
                  </defs>

                  {/* Service block */}
                  <rect x="10" y="8" width="360" height="258" rx="12" fill="#f8fafd" stroke="#bae6fd" strokeWidth="1.4" />
                  <text x="24" y="30" fontSize="13.5" fontWeight="700" fill="#0891b2">
                    Cloud Run サービス（HTTP 常時待機型）
                  </text>

                  <g style={{ cursor: 'pointer' }} onClick={() => setActiveId('svc-trigger')}>
                    <rect x="22" y="42" width="336" height="54" rx="10" fill="#ecfeff" stroke={strokeFor('svc-trigger', '#67e8f9', '#0891b2')} strokeWidth={widthFor('svc-trigger')} />
                    <text x="190" y="65" textAnchor="middle" fontSize="14" fontWeight="700" fill="#155e75">
                      ① HTTP リクエスト到着（Invoker 認証）
                    </text>
                    <text x="190" y="85" textAnchor="middle" fontSize="12" fill="#0e7490">
                      ブラウザ / 他 API / Cloud Tasks / Pub/Sub Push
                    </text>
                  </g>

                  <path d="M 190 96 L 190 116" fill="none" stroke="#64748b" strokeWidth="1.6" markerEnd="url(#w2p1-arr-m)" />

                  <g style={{ cursor: 'pointer' }} onClick={() => setActiveId('svc-container')}>
                    <rect x="22" y="120" width="336" height="56" rx="10" fill="#ffffff" stroke={strokeFor('svc-container', '#cbd5e1', '#0b57d0')} strokeWidth={widthFor('svc-container')} />
                    <text x="190" y="143" textAnchor="middle" fontSize="14" fontWeight="700" fill="#1f1f1f">
                      ② $PORT で待ち受け → HTTP 応答を返す
                    </text>
                    <text x="190" y="164" textAnchor="middle" fontSize="12" fill="#5f6368">
                      応答後は CPU が絞られる（長バッチは不向き）
                    </text>
                  </g>

                  <path d="M 190 176 L 190 196" fill="none" stroke="#64748b" strokeWidth="1.6" markerEnd="url(#w2p1-arr-m)" />

                  <g style={{ cursor: 'pointer' }} onClick={() => setActiveId('svc-scale')}>
                    <rect x="22" y="200" width="336" height="54" rx="10" fill="#e6f4ea" stroke={strokeFor('svc-scale', '#81c995', '#137333')} strokeWidth={widthFor('svc-scale')} />
                    <text x="190" y="223" textAnchor="middle" fontSize="14" fontWeight="700" fill="#0d652d">
                      ③ リビジョン切替 ＆ 0〜max 台へ自動伸縮
                    </text>
                    <text x="190" y="242" textAnchor="middle" fontSize="12" fill="#1e4620">
                      トラフィック 10%→100% / 即時ロールバック可
                    </text>
                  </g>

                  {/* Job block */}
                  <rect x="10" y="282" width="360" height="264" rx="12" fill="#faf5ff" stroke="#ddd6fe" strokeWidth="1.4" />
                  <text x="24" y="305" fontSize="13.5" fontWeight="700" fill="#6d28d9">
                    Cloud Run ジョブ（バッチ完結型）
                  </text>

                  <g style={{ cursor: 'pointer' }} onClick={() => setActiveId('job-trigger')}>
                    <rect x="22" y="317" width="336" height="54" rx="10" fill="#f5f3ff" stroke={strokeFor('job-trigger', '#c4b5fd', '#6d28d9')} strokeWidth={widthFor('job-trigger')} />
                    <text x="190" y="340" textAnchor="middle" fontSize="14" fontWeight="700" fill="#4c1d95">
                      ① Execution（実行）を開始
                    </text>
                    <text x="190" y="360" textAnchor="middle" fontSize="12" fill="#5b21b6">
                      Cloud Scheduler（毎晩2時）/ Workflows / 手動
                    </text>
                  </g>

                  <path d="M 190 371 L 190 391" fill="none" stroke="#64748b" strokeWidth="1.6" markerEnd="url(#w2p1-arr-m)" />

                  <g style={{ cursor: 'pointer' }} onClick={() => setActiveId('job-tasks')}>
                    <rect x="22" y="395" width="336" height="62" rx="10" fill="#ffffff" stroke={strokeFor('job-tasks', '#c4b5fd', '#6d28d9')} strokeWidth={widthFor('job-tasks')} />
                    <text x="190" y="418" textAnchor="middle" fontSize="14" fontWeight="700" fill="#3b0764">
                      ② Task 0..N を並列実行（HTTP ポート不要）
                    </text>
                    <text x="190" y="439" textAnchor="middle" fontSize="12" fill="#5b21b6">
                      TASK_INDEX で分担・失敗タスクのみ自動再試行
                    </text>
                  </g>

                  <path d="M 190 457 L 190 477" fill="none" stroke="#64748b" strokeWidth="1.6" markerEnd="url(#w2p1-arr-m)" />

                  <g style={{ cursor: 'pointer' }} onClick={() => setActiveId('job-exit')}>
                    <rect x="22" y="481" width="336" height="54" rx="10" fill="#e6f4ea" stroke={strokeFor('job-exit', '#81c995', '#137333')} strokeWidth={widthFor('job-exit')} />
                    <text x="190" y="504" textAnchor="middle" fontSize="14" fontWeight="700" fill="#0d652d">
                      ③ 全タスク exit 0 で完了 → 課金即終了
                    </text>
                    <text x="190" y="523" textAnchor="middle" fontSize="12" fill="#1e4620">
                      最大 24 時間/タスク・常駐アイドル課金ゼロ
                    </text>
                  </g>
                </svg>
              ) : (
                <svg
                  className="blueprint-svg"
                  viewBox="0 0 820 356"
                  role="img"
                  aria-label="Cloud Run サービスとジョブのライフサイクル比較骨格図"
                >
                  <title>Cloud Run サービス vs ジョブ</title>
                  <defs>
                    <marker id="w2p1-arr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto">
                      <path d="M0 1l8 4-8 4z" fill="#64748b" />
                    </marker>
                  </defs>

                  {/* Left Column: Cloud Run Service */}
                  <rect x="16" y="12" width="382" height="332" rx="14" fill="#f8fafd" stroke="#bae6fd" strokeWidth="1.5" />
                  <text x="36" y="38" fontSize="14.5" fontWeight="700" fill="#0891b2">
                    Cloud Run サービス（HTTP 待ち受け・API 型）
                  </text>

                  <g style={{ cursor: 'pointer' }} onClick={() => setActiveId('svc-trigger')}>
                    <rect x="34" y="54" width="346" height="68" rx="10" fill="#ecfeff" stroke={strokeFor('svc-trigger', '#67e8f9', '#0891b2')} strokeWidth={widthFor('svc-trigger')} />
                    <text x="207" y="81" textAnchor="middle" fontSize="15" fontWeight="700" fill="#155e75">
                      ① HTTP リクエスト到着（Invoker 認証）
                    </text>
                    <text x="207" y="104" textAnchor="middle" fontSize="12.5" fill="#0e7490">
                      社内ポータル / 他 API / Pub/Sub Push / Cloud Tasks
                    </text>
                  </g>

                  <path d="M 207 122 L 207 150" fill="none" stroke="#64748b" strokeWidth="1.8" markerEnd="url(#w2p1-arr)" />

                  <g style={{ cursor: 'pointer' }} onClick={() => setActiveId('svc-container')}>
                    <rect x="34" y="154" width="346" height="72" rx="10" fill="#ffffff" stroke={strokeFor('svc-container', '#cbd5e1', '#0b57d0')} strokeWidth={widthFor('svc-container')} />
                    <text x="207" y="182" textAnchor="middle" fontSize="15" fontWeight="700" fill="#1f1f1f">
                      ② $PORT（8080）でリッスン → 同期応答
                    </text>
                    <text x="207" y="205" textAnchor="middle" fontSize="12.5" fill="#5f6368">
                      応答後は CPU が絞られるため重い裏処理は NG
                    </text>
                  </g>

                  <path d="M 207 226 L 207 254" fill="none" stroke="#64748b" strokeWidth="1.8" markerEnd="url(#w2p1-arr)" />

                  <g style={{ cursor: 'pointer' }} onClick={() => setActiveId('svc-scale')}>
                    <rect x="34" y="258" width="346" height="70" rx="10" fill="#e6f4ea" stroke={strokeFor('svc-scale', '#81c995', '#137333')} strokeWidth={widthFor('svc-scale')} />
                    <text x="207" y="286" textAnchor="middle" fontSize="15" fontWeight="700" fill="#0d652d">
                      ③ トラフィック分割 ＆ 0〜max 台自動伸縮
                    </text>
                    <text x="207" y="309" textAnchor="middle" fontSize="12.5" fill="#1e4620">
                      例：week01-manual-api（最大 60 分/req）
                    </text>
                  </g>

                  {/* Right Column: Cloud Run Job */}
                  <rect x="414" y="12" width="382" height="332" rx="14" fill="#faf5ff" stroke="#ddd6fe" strokeWidth="1.5" />
                  <text x="434" y="38" fontSize="14.5" fontWeight="700" fill="#6d28d9">
                    Cloud Run ジョブ（処理完結・夜間バッチ型）
                  </text>

                  <g style={{ cursor: 'pointer' }} onClick={() => setActiveId('job-trigger')}>
                    <rect x="432" y="54" width="346" height="68" rx="10" fill="#f5f3ff" stroke={strokeFor('job-trigger', '#c4b5fd', '#6d28d9')} strokeWidth={widthFor('job-trigger')} />
                    <text x="605" y="81" textAnchor="middle" fontSize="15" fontWeight="700" fill="#4c1d95">
                      ① Execution（1 回の実行）を起動
                    </text>
                    <text x="605" y="104" textAnchor="middle" fontSize="12.5" fill="#5b21b6">
                      Cloud Scheduler（毎晩 2 時）/ Workflows / 手動
                    </text>
                  </g>

                  <path d="M 605 122 L 605 150" fill="none" stroke="#64748b" strokeWidth="1.8" markerEnd="url(#w2p1-arr)" />

                  <g style={{ cursor: 'pointer' }} onClick={() => setActiveId('job-tasks')}>
                    <rect x="432" y="154" width="346" height="72" rx="10" fill="#ffffff" stroke={strokeFor('job-tasks', '#c4b5fd', '#6d28d9')} strokeWidth={widthFor('job-tasks')} />
                    <text x="605" y="182" textAnchor="middle" fontSize="15" fontWeight="700" fill="#3b0764">
                      ② Task 0..N 並列実行（HTTP ポート不要）
                    </text>
                    <text x="605" y="205" textAnchor="middle" fontSize="12.5" fill="#5b21b6">
                      TASK_INDEX で分担・失敗タスクだけ自動リトライ
                    </text>
                  </g>

                  <path d="M 605 226 L 605 254" fill="none" stroke="#64748b" strokeWidth="1.8" markerEnd="url(#w2p1-arr)" />

                  <g style={{ cursor: 'pointer' }} onClick={() => setActiveId('job-exit')}>
                    <rect x="432" y="258" width="346" height="70" rx="10" fill="#e6f4ea" stroke={strokeFor('job-exit', '#81c995', '#137333')} strokeWidth={widthFor('job-exit')} />
                    <text x="605" y="286" textAnchor="middle" fontSize="15" fontWeight="700" fill="#0d652d">
                      ③ 全タスク exit 0 で終了 → 課金即停止
                    </text>
                    <text x="605" y="309" textAnchor="middle" fontSize="12.5" fill="#1e4620">
                      例：manual-index-nightly-job（最大 24 時間/task）
                    </text>
                  </g>
                </svg>
              )}
            </div>
          </section>

          {/* Semantic Responsive Comparison Table */}
          <section className="skeleton-principles" aria-labelledby="svc-job-table-heading">
            <div className="skeleton-principles-head">
              <p className="panel-kicker">判断早見表</p>
              <h2 id="svc-job-table-heading" className="skeleton-section-title">
                Cloud Run サービス vs ジョブ 7 観点比較
              </h2>
            </div>

            <div
              tabIndex={0}
              role="region"
              aria-labelledby="svc-job-table-heading"
              className="responsive-table-wrap"
            >
              <table className="comparison-table comparison-table--svc-job">
                <caption className="visually-hidden">
                  Cloud Run サービスと Cloud Run ジョブの 7 観点比較表
                </caption>
                <thead>
                  <tr>
                    <th scope="col">比較軸</th>
                    <th scope="col">Cloud Run サービス</th>
                    <th scope="col">Cloud Run ジョブ</th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARISON_ROWS.map((row) => (
                    <tr key={row.axis}>
                      <th scope="row">{row.axis}</th>
                      <td>{row.service}</td>
                      <td>{row.job}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
