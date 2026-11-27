import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Layers, ListTree } from 'lucide-react';
import type { StepInsight } from '../types';
import { useIsMobile } from '../hooks/useIsMobile';
import { PlaybackBar } from '../components/PlaybackBar';

type ScenarioId = 'normal' | 'no-actas' | 'no-invoker' | 'no-viewer';
type ViewMode = 'architecture' | 'sequence';

interface FlowEvent {
  id: number;
  time: string;
  phase: '設定時' | '入口認証' | '実行時';
  color: string;
  from: string;
  to: string;
  fromKey: 'dev' | 'admin' | 'caller' | 'ingress' | 'runtime' | 'gcs';
  toKey: 'dev' | 'admin' | 'caller' | 'ingress' | 'runtime' | 'gcs';
  packetLabel: string;
  checkLabel: string;
  status: string;
  tone: 'allow' | 'deny' | 'info' | 'warn';
  blocked?: boolean;
  title: string;
  subtitle: string;
  explanation: string;
  payloadTitle: string;
  payloadJson: string;
}

const COLOR_CONTROL = '#4338ca'; // Indigo
const COLOR_INGRESS = '#0891b2'; // Cyan (distinct from Control Plane)
const COLOR_DATA = '#137333';    // Emerald
const COLOR_DENY = '#c5221f';    // Crimson

const SCENARIOS: Record<
  ScenarioId,
  { label: string; dotTone: 'allow' | 'deny' | 'warn'; events: FlowEvent[] }
> = {
  normal: {
    label: '正常',
    dotTone: 'allow',
    events: [
      {
        id: 1,
        time: '0.00s',
        phase: '設定時',
        color: COLOR_CONTROL,
        from: '開発者 / CI',
        to: 'Cloud Run Admin',
        fromKey: 'dev',
        toKey: 'admin',
        packetLabel: 'deploy + SA割当',
        checkLabel: 'run.services.update + actAs',
        status: '200 OK・割当完了',
        tone: 'allow',
        title: '設定時：実行時SAの紐付けと actAs 検証',
        subtitle: '開発者が Cloud Run に専用サービスアカウントを割り当てる',
        explanation:
          'Cloud Run のデプロイ権限に加え、割り当てるサービスアカウント（`sa-reader`）上の `iam.serviceAccounts.actAs` が確認されます。これにより権限昇格を防ぎます。',
        payloadTitle: 'デプロイ時の IAM 検証',
        payloadJson: JSON.stringify(
          {
            principal: 'user:dev@example.com',
            targetService: 'projects/study/locations/asia-northeast1/services/manual-rag',
            attachedRuntimeSA: 'sa-reader@study.iam.gserviceaccount.com',
            checkedPermissions: [
              'run.services.update (on service)',
              'iam.serviceAccounts.actAs (on sa-reader)',
            ],
            decision: 'ALLOW',
          },
          null,
          2,
        ),
      },
      {
        id: 2,
        time: '1.20s',
        phase: '入口認証',
        color: COLOR_INGRESS,
        from: '呼び出し元アプリ',
        to: 'Cloud Run 入口',
        fromKey: 'caller',
        toKey: 'ingress',
        packetLabel: 'GET + IDトークン',
        checkLabel: 'aud一致 + roles/run.invoker',
        status: '200 通過 → コンテナへ',
        tone: 'allow',
        title: '受信時：Cloud Run 入口の Invoker 認証',
        subtitle: '呼び出し元の ID トークンと Invoker ロールをフロント層で検証',
        explanation:
          '非公開の Cloud Run はリクエストをコンテナへ渡す前に、フロント層で ID トークン（`aud` = サービスURL）と呼び出し元の `roles/run.invoker` を評価します。ここではまだ Storage の権限は見ません。',
        payloadTitle: '入口の認証ログ',
        payloadJson: JSON.stringify(
          {
            caller: 'sa-internal-app@study.iam.gserviceaccount.com',
            tokenType: 'OIDC ID Token (JWT)',
            aud: 'https://manual-rag-xxxx.a.run.app',
            requiredPermission: 'run.routes.invoke',
            decision: 'ALLOW -> Forward to Container',
          },
          null,
          2,
        ),
      },
      {
        id: 3,
        time: '1.24s',
        phase: '実行時',
        color: COLOR_DATA,
        from: '実行時ID (sa-reader)',
        to: 'Cloud Storage',
        fromKey: 'runtime',
        toKey: 'gcs',
        packetLabel: 'GET guide.md',
        checkLabel: 'バケット上の Object Viewer',
        status: '200 OK・読取成功',
        tone: 'allow',
        title: '実行時（読取）：実行時IDでバケットから取得',
        subtitle: 'コンテナ内アプリが ADC 経由で取得した実行時IDのトークンを使用',
        explanation:
          'Storage API へ送られる主体は「呼び出し元」ではなく Cloud Run の「実行時ID（`sa-reader`）」です。対象バケット `manual-docs` に `roles/storage.objectViewer` があるため読み取りが成功します。',
        payloadTitle: 'Cloud Storage 読取レスポンス',
        payloadJson: JSON.stringify(
          {
            actingPrincipal: 'sa-reader@study.iam.gserviceaccount.com',
            tokenType: 'OAuth 2.0 Access Token (Metadata Server)',
            resource: 'gs://manual-docs/guide.md',
            requiredPermission: 'storage.objects.get',
            httpStatus: 200,
          },
          null,
          2,
        ),
      },
      {
        id: 4,
        time: '1.31s',
        phase: '実行時',
        color: COLOR_DENY,
        from: '実行時ID (sa-reader)',
        to: 'Cloud Storage',
        fromKey: 'runtime',
        toKey: 'gcs',
        packetLabel: 'POST new.txt',
        checkLabel: 'storage.objects.create',
        status: '403・書込拒否',
        tone: 'deny',
        blocked: true,
        title: '実行時（書込）：最小権限により新規作成を拒否',
        subtitle: 'Object Viewer には作成権限が含まれないため Storage が 403 を返す',
        explanation:
          '読み取りと同じ実行時IDでも、新規書き込みには `storage.objects.create` が必要です。`roles/storage.objectViewer` のみを付与しているため、意図通り Cloud Storage 側で 403 拒否されます。',
        payloadTitle: 'Cloud Storage 書込拒否ログ',
        payloadJson: JSON.stringify(
          {
            actingPrincipal: 'sa-reader@study.iam.gserviceaccount.com',
            resource: 'gs://manual-docs/new.txt',
            requiredPermission: 'storage.objects.create',
            matchedRole: 'roles/storage.objectViewer (read-only)',
            httpStatus: 403,
            error: 'PERMISSION_DENIED',
          },
          null,
          2,
        ),
      },
    ],
  },
  'no-actas': {
    label: 'actAs なし',
    dotTone: 'deny',
    events: [
      {
        id: 1,
        time: '0.00s',
        phase: '設定時',
        color: COLOR_DENY,
        from: '開発者 / CI',
        to: 'Cloud Run Admin',
        fromKey: 'dev',
        toKey: 'admin',
        packetLabel: 'deploy + SA割当',
        checkLabel: 'iam.serviceAccounts.actAs',
        status: '403・actAs 拒否',
        tone: 'deny',
        blocked: true,
        title: 'デプロイ失敗：actAs 権限不足で割当をブロック',
        subtitle: 'Cloud Run デプロイ権限があっても SA 利用権限が無ければ止まる',
        explanation:
          '開発者は Cloud Run のデプロイ権限を持っていても、割り当て先 SA（`sa-reader`）に対する `iam.serviceAccounts.actAs` がありません。新しいリビジョンは作られません。',
        payloadTitle: 'デプロイ拒否エラー',
        payloadJson: JSON.stringify(
          {
            principal: 'user:dev@example.com',
            missingPermission: 'iam.serviceAccounts.actAs',
            whereToInspect: 'IAM policy on sa-reader@study.iam.gserviceaccount.com',
            fix: 'Grant roles/iam.serviceAccountUser on sa-reader',
            httpStatus: 403,
          },
          null,
          2,
        ),
      },
    ],
  },
  'no-invoker': {
    label: 'Invoker なし',
    dotTone: 'deny',
    events: [
      {
        id: 1,
        time: '0.00s',
        phase: '設定時',
        color: COLOR_CONTROL,
        from: '開発者 / CI',
        to: 'Cloud Run Admin',
        fromKey: 'dev',
        toKey: 'admin',
        packetLabel: 'deploy + SA割当',
        checkLabel: 'run.services.update + actAs',
        status: '200 OK・割当完了',
        tone: 'allow',
        title: 'デプロイ自体は正常に完了',
        subtitle: 'デプロイ権限と呼び出し権限は完全に独立している',
        explanation:
          'デプロイは成功するため「構築できたはずなのになぜ繋がらない？」と混乱しがちです。入口の `roles/run.invoker` は次のリクエスト受信時に評価されます。',
        payloadTitle: 'デプロイ完了ログ',
        payloadJson: JSON.stringify({ revision: 'manual-rag-00002', status: 'READY' }, null, 2),
      },
      {
        id: 2,
        time: '1.20s',
        phase: '入口認証',
        color: COLOR_DENY,
        from: '呼び出し元アプリ',
        to: 'Cloud Run 入口',
        fromKey: 'caller',
        toKey: 'ingress',
        packetLabel: 'GET + IDトークン',
        checkLabel: 'roles/run.invoker',
        status: '403・入口で遮断',
        tone: 'deny',
        blocked: true,
        title: '入口で遮断：アプリコードは 1 行も動かない',
        subtitle: 'Cloud Run フロント層が 403 を返し、Storage へは一切到達しない',
        explanation:
          '呼び出し元に `roles/run.invoker` が付いていないため、Cloud Run の入口で即座に 403 が返されます。アプリログが出ない場合はまずこの入口認証を疑います。',
        payloadTitle: '入口 403 エラー',
        payloadJson: JSON.stringify(
          {
            caller: 'sa-internal-app@study.iam.gserviceaccount.com',
            reachedContainer: false,
            missingRole: 'roles/run.invoker (on manual-rag service)',
            httpStatus: 403,
          },
          null,
          2,
        ),
      },
    ],
  },
  'no-viewer': {
    label: 'Viewer なし',
    dotTone: 'warn',
    events: [
      {
        id: 1,
        time: '0.00s',
        phase: '設定時',
        color: COLOR_CONTROL,
        from: '開発者 / CI',
        to: 'Cloud Run Admin',
        fromKey: 'dev',
        toKey: 'admin',
        packetLabel: 'deploy + SA割当',
        checkLabel: 'run.services.update + actAs',
        status: '200 OK・割当完了',
        tone: 'allow',
        title: '設定時：デプロイは成功',
        subtitle: '実行時SAの紐付け自体は問題なく通る',
        explanation: 'デプロイ時には実行時SAがバケットを読めるかどうかまでは検査されません。',
        payloadTitle: 'デプロイ完了ログ',
        payloadJson: JSON.stringify({ attachedRuntimeSA: 'sa-reader@study.iam.gserviceaccount.com' }, null, 2),
      },
      {
        id: 2,
        time: '1.20s',
        phase: '入口認証',
        color: COLOR_INGRESS,
        from: '呼び出し元アプリ',
        to: 'Cloud Run 入口',
        fromKey: 'caller',
        toKey: 'ingress',
        packetLabel: 'GET + IDトークン',
        checkLabel: 'roles/run.invoker',
        status: '200 通過 → コンテナへ',
        tone: 'allow',
        title: '受信時：Cloud Run 入口は問題なく通過',
        subtitle: '呼び出し元に Invoker があるためコンテナのハンドラが実行される',
        explanation: '入口認証は通過済みです。Cloud Run のアクセスログにはコンテナへ到達した記録が残ります。',
        payloadTitle: '入口通過ログ',
        payloadJson: JSON.stringify({ reachedContainer: true, handler: 'GET /manual' }, null, 2),
      },
      {
        id: 3,
        time: '1.25s',
        phase: '実行時',
        color: COLOR_DENY,
        from: '実行時ID (sa-reader)',
        to: 'Cloud Storage',
        fromKey: 'runtime',
        toKey: 'gcs',
        packetLabel: 'GET guide.md',
        checkLabel: 'バケット上の Object Viewer',
        status: '403・バケット拒否',
        tone: 'deny',
        blocked: true,
        title: '実行時で失敗：呼び出し元ではなく実行時IDの権限不足',
        subtitle: '「入口は通ったのに失敗」は Data Plane 側の権限を見る合図',
        explanation:
          'たとえ呼び出し元が Storage 権限を持っていても無意味です。Cloud Storage は Cloud Run に紐付いた実行時ID（`sa-reader`）を評価し、`manual-docs` に `roles/storage.objectViewer` が無いため 403 を返します。',
        payloadTitle: 'Storage 403 エラー',
        payloadJson: JSON.stringify(
          {
            actingPrincipal: 'sa-reader@study.iam.gserviceaccount.com',
            resource: 'gs://manual-docs/guide.md',
            missingRole: 'roles/storage.objectViewer (on manual-docs)',
            httpStatus: 403,
          },
          null,
          2,
        ),
      },
    ],
  },
};

/* Desktop wire endpoints (strictly in open gaps between boxes, zero node overlap) */
const DESKTOP_WIRES: Record<FlowEvent['fromKey'], { x1: number; x2: number; y: number }> = {
  dev: { x1: 218, x2: 344, y: 128 },
  admin: { x1: 218, x2: 344, y: 128 },
  caller: { x1: 186, x2: 250, y: 332 },
  ingress: { x1: 186, x2: 250, y: 332 },
  runtime: { x1: 564, x2: 630, y: 332 },
  gcs: { x1: 564, x2: 630, y: 332 },
};

/* Mobile vertical wire gaps (56px gap between boxes -> diamond centered, pill sits cleanly inside x=214..358) */
const MOBILE_WIRES: Record<FlowEvent['fromKey'], { y1: number; y2: number }> = {
  dev: { y1: 102, y2: 158 },
  admin: { y1: 102, y2: 158 },
  caller: { y1: 332, y2: 392 },
  ingress: { y1: 332, y2: 392 },
  runtime: { y1: 536, y2: 594 },
  gcs: { y1: 536, y2: 594 },
};

const SEQ_COLS: { key: FlowEvent['fromKey']; label: string; sub: string; x: number }[] = [
  { key: 'dev', label: '開発者', sub: 'Deployer', x: 132 },
  { key: 'admin', label: 'Cloud Run Admin', sub: 'Control Plane', x: 282 },
  { key: 'caller', label: '呼び出し元', sub: 'Caller', x: 432 },
  { key: 'ingress', label: 'Cloud Run', sub: '入口 / 実行時', x: 582 },
  { key: 'gcs', label: 'Cloud Storage', sub: 'manual-docs', x: 734 },
];

interface Part1Props {
  onStepInsightChange: (insight: StepInsight) => void;
}

export function Part1CloudRunViz({ onStepInsightChange }: Part1Props) {
  const isMobile = useIsMobile();
  const [scenarioId, setScenarioId] = useState<ScenarioId>('normal');
  const [viewMode, setViewMode] = useState<ViewMode>('architecture');
  const [stepIdx, setStepIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [progress, setProgress] = useState(1);
  const rafRef = useRef<number | null>(null);

  const scenario = SCENARIOS[scenarioId];
  const safeIdx = Math.min(stepIdx, scenario.events.length - 1);
  const activeEvent = scenario.events[safeIdx];

  useEffect(() => {
    onStepInsightChange({
      stepNumber: safeIdx + 1,
      totalSteps: scenario.events.length,
      badge: activeEvent.phase,
      title: activeEvent.title,
      subtitle: activeEvent.subtitle,
      explanation: activeEvent.explanation,
      kvPairs: [
        { label: '送信元', value: activeEvent.from },
        { label: '宛先', value: activeEvent.to },
        { label: '確認ポイント', value: activeEvent.checkLabel },
        { label: '判定結果', value: activeEvent.status, tone: activeEvent.tone },
      ],
      payloadTitle: activeEvent.payloadTitle,
      payloadJson: activeEvent.payloadJson,
    });
  }, [activeEvent, safeIdx, scenario.events.length, onStepInsightChange]);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      setProgress(1);
      if (!isPlaying) return;
      const timer = window.setTimeout(() => {
        if (safeIdx < scenario.events.length - 1) setStepIdx((i) => i + 1);
        else setIsPlaying(false);
      }, 1700 / speed);
      return () => window.clearTimeout(timer);
    }

    let start: number | null = null;
    const duration = 1350 / speed;
    const hold = 900 / speed;

    const tick = (ts: number) => {
      if (start === null) start = ts;
      const elapsed = ts - start;
      setProgress(Math.min(1, elapsed / duration));
      if (elapsed < duration) {
        rafRef.current = requestAnimationFrame(tick);
      } else if (isPlaying) {
        if (elapsed < duration + hold) {
          rafRef.current = requestAnimationFrame(tick);
        } else if (safeIdx < scenario.events.length - 1) {
          setStepIdx((i) => i + 1);
        } else {
          setIsPlaying(false);
        }
      }
    };

    setProgress(0);
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [safeIdx, scenarioId, isPlaying, speed, scenario.events.length]);

  const handleSelectScenario = (id: ScenarioId) => {
    setScenarioId(id);
    setStepIdx(0);
    setIsPlaying(false);
  };

  const handleTogglePlay = () => {
    if (!isPlaying && safeIdx === scenario.events.length - 1) setStepIdx(0);
    setIsPlaying((prev) => !prev);
  };

  const handleStepNext = () => {
    setIsPlaying(false);
    setStepIdx((i) => (i + 1) % scenario.events.length);
  };

  const handleStepPrev = () => {
    setIsPlaying(false);
    setStepIdx((i) => Math.max(0, i - 1));
  };

  const handleReset = () => {
    setIsPlaying(false);
    setStepIdx(0);
  };

  const packetCoord = useMemo(() => {
    const maxT = activeEvent.blocked ? 0.56 : 1;
    const t = Math.min(progress, maxT) / maxT;
    const eased = 1 - Math.pow(1 - t, 3);
    const travel = activeEvent.blocked ? eased * 0.5 : eased;

    if (isMobile) {
      const seg = MOBILE_WIRES[activeEvent.fromKey];
      const midY = (seg.y1 + seg.y2) / 2;
      return {
        x: 190,
        y: seg.y1 + (seg.y2 - seg.y1) * Math.min(0.82, travel),
        midX: 190,
        midY,
        reachedCheck: progress >= 0.48,
      };
    }

    const seg = DESKTOP_WIRES[activeEvent.fromKey];
    const midX = (seg.x1 + seg.x2) / 2;
    return {
      x: seg.x1 + (seg.x2 - seg.x1) * travel,
      y: seg.y,
      midX,
      midY: seg.y,
      reachedCheck: progress >= 0.48,
    };
  }, [activeEvent, progress, isMobile]);

  const seqX = (key: FlowEvent['fromKey']) => {
    const mapped = key === 'runtime' ? 'ingress' : key;
    return SEQ_COLS.find((c) => c.key === mapped)?.x ?? 400;
  };

  return (
    <div className="viz-workspace">
      <div className="canvas-card">
        <div className="canvas-toolbar">
          <div className="segmented" role="group" aria-label="表示モード切替">
            <button
              type="button"
              className="seg-btn"
              aria-pressed={viewMode === 'architecture'}
              onClick={() => setViewMode('architecture')}
            >
              <Layers size={14} aria-hidden="true" />
              空間図
            </button>
            <button
              type="button"
              className="seg-btn"
              aria-pressed={viewMode === 'sequence'}
              onClick={() => setViewMode('sequence')}
            >
              <ListTree size={14} aria-hidden="true" />
              シーケンス
            </button>
          </div>

          <div className="toolbar-group">
            <span className="toolbar-label">構成:</span>
            <div className="scenario-bar" role="group" aria-label="権限構成シナリオ">
              {(Object.keys(SCENARIOS) as ScenarioId[]).map((id) => {
                const selected = scenarioId === id;
                return (
                  <button
                    key={id}
                    type="button"
                    className="scenario-pill"
                    aria-pressed={selected}
                    onClick={() => handleSelectScenario(id)}
                  >
                    {selected ? (
                      <Check size={14} strokeWidth={2.5} aria-hidden="true" />
                    ) : (
                      <span className={`chip-dot ${SCENARIOS[id].dotTone}`} aria-hidden="true" />
                    )}
                    {SCENARIOS[id].label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="blueprint-stage">
          {isMobile && viewMode === 'architecture' ? (
            /* 1:1 PORTRAIT MOBILE ARCHITECTURE (zero overlap, Cloud Run Service label + manual-docs consistent) */
            <svg
              className="blueprint-svg"
              viewBox="0 0 380 662"
              role="img"
              aria-label={`Cloud Run の3つの権限境界（${SCENARIOS[scenarioId].label}）`}
            >
              <title>Cloud Run 2プレーン権限アーキテクチャ図（モバイル）</title>
              <defs>
                <marker id="p1m-indigo" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                  <path d="M0 1l8 4-8 4z" fill={COLOR_CONTROL} />
                </marker>
                <marker id="p1m-cyan" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                  <path d="M0 1l8 4-8 4z" fill={COLOR_INGRESS} />
                </marker>
                <marker id="p1m-green" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                  <path d="M0 1l8 4-8 4z" fill={COLOR_DATA} />
                </marker>
                <marker id="p1m-red" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                  <path d="M0 1l8 4-8 4z" fill={COLOR_DENY} />
                </marker>
                <marker id="p1m-muted" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                  <path d="M0 1l8 4-8 4z" fill="#94a3b8" />
                </marker>
              </defs>

              {/* PHASE 1: CONTROL PLANE */}
              <rect
                x="10"
                y="10"
                width="360"
                height="214"
                rx="14"
                fill={activeEvent.phase === '設定時' ? '#f5f7ff' : '#ffffff'}
                stroke={activeEvent.phase === '設定時' ? COLOR_CONTROL : '#d5dfef'}
                strokeWidth={activeEvent.phase === '設定時' ? 2 : 1.3}
              />
              <text x="22" y="34" fontSize="13" fontWeight="700" fill={COLOR_CONTROL}>
                1. 設定・デプロイ時（Control Plane）
              </text>

              <rect
                x="32"
                y="48"
                width="316"
                height="52"
                rx="10"
                fill="#ffffff"
                stroke={activeEvent.fromKey === 'dev' ? COLOR_CONTROL : '#94a3b8'}
                strokeWidth={activeEvent.fromKey === 'dev' ? 2.2 : 1.3}
              />
              <text x="190" y="72" textAnchor="middle" fontSize="15.5" fontWeight="700" fill="#1f1f1f">
                開発者 / CI
              </text>
              <text x="190" y="91" textAnchor="middle" fontSize="12.5" fill="#5f6368">
                デプロイ権限 ＋ actAs を検証
              </text>

              <line
                x1="190"
                y1="100"
                x2="190"
                y2="154"
                stroke={activeEvent.phase === '設定時' ? activeEvent.color : '#94a3b8'}
                strokeWidth={activeEvent.phase === '設定時' ? 2.6 : 1.5}
                markerEnd={
                  activeEvent.phase === '設定時'
                    ? activeEvent.blocked
                      ? 'url(#p1m-red)'
                      : 'url(#p1m-indigo)'
                    : 'url(#p1m-muted)'
                }
              />

              <rect
                x="32"
                y="158"
                width="316"
                height="54"
                rx="10"
                fill={scenarioId === 'no-actas' ? '#fce8e6' : '#eef2ff'}
                stroke={activeEvent.toKey === 'admin' ? activeEvent.color : '#6366f1'}
                strokeWidth={activeEvent.toKey === 'admin' ? 2.2 : 1.4}
              />
              <text x="190" y="182" textAnchor="middle" fontSize="15.5" fontWeight="700" fill="#1f1f1f">
                Cloud Run Admin → SA割当
              </text>
              <text x="190" y="202" textAnchor="middle" fontSize="12.5" fontWeight="600" fill={scenarioId === 'no-actas' ? COLOR_DENY : COLOR_CONTROL}>
                {scenarioId === 'no-actas' ? '✕ actAs不足で割当失敗' : '実行時ID: sa-reader を紐付け'}
              </text>

              {/* PHASE 2: DATA PLANE */}
              <rect
                x="10"
                y="238"
                width="360"
                height="414"
                rx="14"
                fill={activeEvent.phase !== '設定時' ? '#f8fbff' : '#ffffff'}
                stroke={activeEvent.phase !== '設定時' ? '#0b57d0' : '#d5dfef'}
                strokeWidth={activeEvent.phase !== '設定時' ? 2 : 1.3}
                opacity={scenarioId === 'no-actas' ? 0.42 : 1}
              />
              <text x="22" y="262" fontSize="13" fontWeight="700" fill="#0b57d0">
                2. リクエスト・実行時（Data Plane）
              </text>

              <rect
                x="32"
                y="276"
                width="316"
                height="54"
                rx="10"
                fill="#ffffff"
                stroke={activeEvent.fromKey === 'caller' ? COLOR_INGRESS : '#94a3b8'}
                strokeWidth={activeEvent.fromKey === 'caller' ? 2.2 : 1.3}
              />
              <text x="190" y="300" textAnchor="middle" fontSize="15.5" fontWeight="700" fill="#1f1f1f">
                呼び出し元アプリ
              </text>
              <text x="190" y="320" textAnchor="middle" fontSize="12.5" fill="#5f6368">
                ID トークン添付
              </text>

              <line
                x1="190"
                y1="330"
                x2="190"
                y2="388"
                stroke={activeEvent.phase === '入口認証' ? activeEvent.color : '#94a3b8'}
                strokeWidth={activeEvent.phase === '入口認証' ? 2.6 : 1.5}
                markerEnd={
                  activeEvent.phase === '入口認証'
                    ? activeEvent.blocked
                      ? 'url(#p1m-red)'
                      : 'url(#p1m-cyan)'
                    : 'url(#p1m-muted)'
                }
              />

              {/* Cloud Run Service dashed box WITH explicit label */}
              <rect x="20" y="380" width="340" height="162" rx="12" fill="#ffffff" stroke="#7dd3fc" strokeWidth="1.5" strokeDasharray="6 3" />
              <text x="32" y="398" fontSize="11.5" fontWeight="700" fill={COLOR_INGRESS} fontFamily="ui-monospace, monospace">
                Cloud Run Service (Private)
              </text>

              <rect
                x="32"
                y="406"
                width="316"
                height="50"
                rx="9"
                fill={activeEvent.toKey === 'ingress' ? '#ecfeff' : '#f8fafd'}
                stroke={activeEvent.toKey === 'ingress' ? COLOR_INGRESS : '#94a3b8'}
                strokeWidth={activeEvent.toKey === 'ingress' ? 2.2 : 1.3}
              />
              <text x="190" y="429" textAnchor="middle" fontSize="15" fontWeight="700" fill="#1f1f1f">
                Cloud Run 入口（Invoker 関所）
              </text>
              <text x="190" y="447" textAnchor="middle" fontSize="12.5" fill="#5f6368" fontFamily="ui-monospace, monospace">
                roles/run.invoker 検証
              </text>

              <line
                x1="190"
                y1="456"
                x2="190"
                y2="478"
                stroke={safeIdx >= 2 ? COLOR_DATA : '#cbd5e1'}
                strokeWidth="2"
                strokeDasharray="4 3"
                markerEnd={safeIdx >= 2 ? 'url(#p1m-green)' : 'url(#p1m-muted)'}
              />

              <rect
                x="32"
                y="482"
                width="316"
                height="50"
                rx="9"
                fill={activeEvent.fromKey === 'runtime' ? '#e6f4ea' : '#f8fafd'}
                stroke={activeEvent.fromKey === 'runtime' ? COLOR_DATA : '#94a3b8'}
                strokeWidth={activeEvent.fromKey === 'runtime' ? 2.2 : 1.3}
              />
              <text x="190" y="505" textAnchor="middle" fontSize="15" fontWeight="700" fill="#1f1f1f">
                実行時コンテナ（sa-reader）
              </text>
              <text x="190" y="523" textAnchor="middle" fontSize="12.5" fill={COLOR_DATA}>
                OAuth トークンで Storage へ
              </text>

              <line
                x1="190"
                y1="532"
                x2="190"
                y2="588"
                stroke={activeEvent.phase === '実行時' ? activeEvent.color : '#94a3b8'}
                strokeWidth={activeEvent.phase === '実行時' ? 2.6 : 1.5}
                markerEnd={
                  activeEvent.phase === '実行時'
                    ? activeEvent.blocked
                      ? 'url(#p1m-red)'
                      : 'url(#p1m-green)'
                    : 'url(#p1m-muted)'
                }
              />

              {/* Cloud Storage (consistent manual-docs name) */}
              <rect
                x="32"
                y="592"
                width="316"
                height="50"
                rx="10"
                fill="#ffffff"
                stroke={activeEvent.toKey === 'gcs' ? activeEvent.color : '#94a3b8'}
                strokeWidth={activeEvent.toKey === 'gcs' ? 2.2 : 1.3}
              />
              <text x="190" y="615" textAnchor="middle" fontSize="15" fontWeight="700" fill="#1f1f1f">
                Cloud Storage（manual-docs）
              </text>
              <text x="190" y="633" textAnchor="middle" fontSize="12.5" fill="#5f6368">
                Object Viewer で読取OK・書込403
              </text>

              {/* Checkpoint Diamond centered on wire gap (never covered by pill!) */}
              <g transform={`translate(${packetCoord.midX}, ${packetCoord.midY})`}>
                <rect
                  x="-12"
                  y="-12"
                  width="24"
                  height="24"
                  rx="4"
                  transform="rotate(45)"
                  fill={packetCoord.reachedCheck ? (activeEvent.blocked ? '#fce8e6' : '#e6f4ea') : '#ffffff'}
                  stroke={packetCoord.reachedCheck ? (activeEvent.blocked ? COLOR_DENY : COLOR_DATA) : '#0b57d0'}
                  strokeWidth="2"
                />
                <text
                  y="5"
                  textAnchor="middle"
                  fontSize="13.5"
                  fontWeight="800"
                  fill={packetCoord.reachedCheck ? (activeEvent.blocked ? COLOR_DENY : COLOR_DATA) : '#0b57d0'}
                >
                  {packetCoord.reachedCheck ? (activeEvent.blocked ? '✕' : '✓') : '?'}
                </text>
              </g>

              {/* Packet pill positioned cleanly to the RIGHT of the diamond, strictly inside x=214..358 */}
              <g transform={`translate(216, ${packetCoord.midY})`}>
                <rect x="0" y="-14" width="142" height="28" rx="14" fill={activeEvent.color} />
                <text x="71" y="4.5" textAnchor="middle" fontSize="12" fontWeight="700" fill="#ffffff">
                  {activeEvent.packetLabel}
                </text>
              </g>
            </svg>
          ) : isMobile && viewMode === 'sequence' ? (
            <svg className="blueprint-svg" viewBox="0 0 380 426" role="img" aria-label="Cloud Run 時系列シーケンス">
              <title>Cloud Run 時系列シーケンス（モバイル）</title>
              {scenario.events.map((ev, idx) => {
                const y = 14 + idx * 100;
                const isCurrent = idx === safeIdx;
                const lineColor = ev.blocked ? COLOR_DENY : ev.color;
                return (
                  <g
                    key={ev.id}
                    opacity={idx > safeIdx ? 0.35 : 1}
                    style={{ cursor: 'pointer' }}
                    onClick={() => {
                      setIsPlaying(false);
                      setStepIdx(idx);
                    }}
                  >
                    <rect
                      x="10"
                      y={y}
                      width="360"
                      height="88"
                      rx="12"
                      fill={isCurrent ? (ev.blocked ? '#fce8e6' : '#e8f0fe') : '#ffffff'}
                      stroke={isCurrent ? lineColor : '#d5dfef'}
                      strokeWidth={isCurrent ? 2 : 1.2}
                    />
                    <rect x="22" y={y + 12} width="54" height="22" rx="11" fill={lineColor} />
                    <text x="49" y={y + 27} textAnchor="middle" fontSize="12" fontWeight="700" fill="#ffffff" fontFamily="ui-monospace, monospace">
                      {ev.time}
                    </text>
                    <text x="86" y={y + 28} fontSize="14.5" fontWeight="700" fill="#1f1f1f">
                      {ev.from} → {ev.to}
                    </text>
                    <text x="24" y={y + 54} fontSize="13.5" fill="#444746">
                      {ev.packetLabel}
                    </text>
                    <text x="24" y={y + 75} fontSize="13.5" fontWeight="700" fill={lineColor}>
                      {ev.status}
                    </text>
                  </g>
                );
              })}
            </svg>
          ) : viewMode === 'architecture' ? (
            /* DESKTOP 2-PLANE ARCHITECTURE (larger fonts >= 13.5px; packet pill clear of all node edges) */
            <svg
              className="blueprint-svg"
              viewBox="0 0 820 434"
              role="img"
              aria-label={`Cloud Run の3つの権限境界（${SCENARIOS[scenarioId].label}）`}
            >
              <title>Cloud Run 2プレーン権限アーキテクチャ図</title>
              <defs>
                <marker id="p1-indigo" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                  <path d="M0 1l8 4-8 4z" fill={COLOR_CONTROL} />
                </marker>
                <marker id="p1-cyan" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                  <path d="M0 1l8 4-8 4z" fill={COLOR_INGRESS} />
                </marker>
                <marker id="p1-green" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                  <path d="M0 1l8 4-8 4z" fill={COLOR_DATA} />
                </marker>
                <marker id="p1-red" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                  <path d="M0 1l8 4-8 4z" fill={COLOR_DENY} />
                </marker>
                <marker id="p1-muted" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                  <path d="M0 1l8 4-8 4z" fill="#94a3b8" />
                </marker>
              </defs>

              {/* Plane 1: Control Plane */}
              <rect
                x="16"
                y="14"
                width="788"
                height="168"
                rx="14"
                fill={activeEvent.phase === '設定時' ? '#f5f7ff' : '#ffffff'}
                stroke={activeEvent.phase === '設定時' ? COLOR_CONTROL : '#d5dfef'}
                strokeWidth={activeEvent.phase === '設定時' ? 2 : 1.2}
              />
              <text x="34" y="42" fontSize="14" fontWeight="700" fill={COLOR_CONTROL}>
                1. 設定・デプロイ時（Control Plane）
              </text>

              {/* Deployer */}
              <rect
                x="34"
                y="92"
                width="184"
                height="72"
                rx="11"
                fill="#ffffff"
                stroke={activeEvent.fromKey === 'dev' ? COLOR_CONTROL : '#94a3b8'}
                strokeWidth={activeEvent.fromKey === 'dev' ? 2.2 : 1.3}
              />
              <text x="126" y="122" textAnchor="middle" fontSize="16" fontWeight="700" fill="#1f1f1f">
                開発者 / CI
              </text>
              <text x="126" y="146" textAnchor="middle" fontSize="13.5" fill="#5f6368">
                デプロイ主体
              </text>

              {/* Cloud Run Admin */}
              <rect
                x="348"
                y="92"
                width="192"
                height="72"
                rx="11"
                fill="#ffffff"
                stroke={activeEvent.toKey === 'admin' ? COLOR_CONTROL : '#94a3b8'}
                strokeWidth={activeEvent.toKey === 'admin' ? 2.2 : 1.3}
              />
              <text x="444" y="122" textAnchor="middle" fontSize="16" fontWeight="700" fill="#1f1f1f">
                Cloud Run Admin
              </text>
              <text x="444" y="146" textAnchor="middle" fontSize="13.5" fill="#5f6368">
                SA割当・リビジョン作成
              </text>

              {/* Bound SA */}
              <rect
                x="596"
                y="92"
                width="190"
                height="72"
                rx="11"
                fill={scenarioId === 'no-actas' ? '#fce8e6' : '#eef2ff'}
                stroke={scenarioId === 'no-actas' ? COLOR_DENY : '#6366f1'}
                strokeWidth="1.5"
                strokeDasharray={scenarioId === 'no-actas' ? '5 4' : undefined}
              />
              <text x="691" y="122" textAnchor="middle" fontSize="15.5" fontWeight="700" fill="#1f1f1f">
                割り当て対象 SA
              </text>
              <text x="691" y="146" textAnchor="middle" fontSize="13.5" fill={scenarioId === 'no-actas' ? COLOR_DENY : COLOR_CONTROL} fontFamily="ui-monospace, monospace">
                sa-reader
              </text>

              {/* Control Plane wires */}
              <line
                x1="218"
                y1="128"
                x2="342"
                y2="128"
                stroke={activeEvent.phase === '設定時' ? activeEvent.color : '#94a3b8'}
                strokeWidth={activeEvent.phase === '設定時' ? 2.6 : 1.5}
                strokeDasharray={activeEvent.phase === '設定時' ? '6 4' : undefined}
                className={activeEvent.phase === '設定時' && !activeEvent.blocked ? 'svg-dash-flow' : ''}
                markerEnd={
                  activeEvent.phase === '設定時'
                    ? activeEvent.blocked
                      ? 'url(#p1-red)'
                      : 'url(#p1-indigo)'
                    : 'url(#p1-muted)'
                }
              />
              <line x1="540" y1="128" x2="590" y2="128" stroke={scenarioId === 'no-actas' ? COLOR_DENY : '#6366f1'} strokeWidth="1.6" strokeDasharray="4 4" />
              <path
                d="M 691 164 L 691 198 L 490 198 L 490 276"
                fill="none"
                stroke={scenarioId === 'no-actas' ? '#cbd5e1' : '#6366f1'}
                strokeWidth="1.8"
                strokeDasharray="5 4"
                markerEnd="url(#p1-muted)"
              />
              <rect x="520" y="185" width="160" height="24" rx="12" fill="#ffffff" stroke="#c7d2fe" />
              <text x="600" y="201.5" textAnchor="middle" fontSize="12.5" fontWeight="650" fill={COLOR_CONTROL}>
                {scenarioId === 'no-actas' ? '未反映（割当失敗）' : '実行時IDとして紐付け'}
              </text>

              {/* Plane 2: Data Plane */}
              <rect
                x="16"
                y="218"
                width="788"
                height="202"
                rx="14"
                fill={activeEvent.phase !== '設定時' ? '#f8fbff' : '#ffffff'}
                stroke={activeEvent.phase !== '設定時' ? '#0b57d0' : '#d5dfef'}
                strokeWidth={activeEvent.phase !== '設定時' ? 2 : 1.2}
                opacity={scenarioId === 'no-actas' ? 0.44 : 1}
              />
              <text x="34" y="246" fontSize="14" fontWeight="700" fill="#0b57d0">
                2. リクエスト・実行時（Data Plane）
              </text>

              {/* Caller */}
              <rect
                x="30"
                y="296"
                width="156"
                height="74"
                rx="11"
                fill="#ffffff"
                stroke={activeEvent.fromKey === 'caller' ? COLOR_INGRESS : '#94a3b8'}
                strokeWidth={activeEvent.fromKey === 'caller' ? 2.2 : 1.3}
              />
              <text x="108" y="326" textAnchor="middle" fontSize="15.5" fontWeight="700" fill="#1f1f1f">
                呼び出し元
              </text>
              <text x="108" y="350" textAnchor="middle" fontSize="13" fill="#5f6368">
                IDトークン添付
              </text>

              {/* Cloud Run Service dashed box */}
              <rect x="242" y="264" width="330" height="134" rx="12" fill="#ffffff" stroke="#7dd3fc" strokeWidth="1.5" strokeDasharray="6 3" />
              <text x="256" y="284" fontSize="12.5" fontWeight="700" fill={COLOR_INGRESS} fontFamily="ui-monospace, monospace">
                Cloud Run Service (Private)
              </text>

              {/* Ingress */}
              <rect
                x="254"
                y="298"
                width="134"
                height="72"
                rx="10"
                fill={activeEvent.toKey === 'ingress' ? '#ecfeff' : '#f8fafd'}
                stroke={activeEvent.toKey === 'ingress' ? COLOR_INGRESS : '#94a3b8'}
                strokeWidth={activeEvent.toKey === 'ingress' ? 2.2 : 1.3}
              />
              <text x="321" y="328" textAnchor="middle" fontSize="15" fontWeight="700" fill="#1f1f1f">
                入口関所
              </text>
              <text x="321" y="351" textAnchor="middle" fontSize="13" fill="#5f6368">
                Invoker 検証
              </text>

              {/* Runtime */}
              <rect
                x="422"
                y="298"
                width="138"
                height="72"
                rx="10"
                fill={activeEvent.fromKey === 'runtime' ? '#e6f4ea' : '#f8fafd'}
                stroke={activeEvent.fromKey === 'runtime' ? COLOR_DATA : '#94a3b8'}
                strokeWidth={activeEvent.fromKey === 'runtime' ? 2.2 : 1.3}
              />
              <text x="491" y="328" textAnchor="middle" fontSize="15" fontWeight="700" fill="#1f1f1f">
                実行時コンテナ
              </text>
              <text x="491" y="351" textAnchor="middle" fontSize="13" fill={COLOR_DATA} fontFamily="ui-monospace, monospace">
                sa-reader
              </text>

              {/* Cloud Storage (consistent manual-docs name) */}
              <rect
                x="634"
                y="296"
                width="154"
                height="74"
                rx="11"
                fill="#ffffff"
                stroke={activeEvent.toKey === 'gcs' ? activeEvent.color : '#94a3b8'}
                strokeWidth={activeEvent.toKey === 'gcs' ? 2.2 : 1.3}
              />
              <text x="711" y="326" textAnchor="middle" fontSize="15.5" fontWeight="700" fill="#1f1f1f">
                Cloud Storage
              </text>
              <text x="711" y="350" textAnchor="middle" fontSize="13" fill="#5f6368" fontFamily="ui-monospace, monospace">
                manual-docs
              </text>

              {/* Data plane wires */}
              <line
                x1="186"
                y1="332"
                x2="248"
                y2="332"
                stroke={activeEvent.phase === '入口認証' ? activeEvent.color : '#94a3b8'}
                strokeWidth={activeEvent.phase === '入口認証' ? 2.6 : 1.5}
                markerEnd={
                  activeEvent.phase === '入口認証'
                    ? activeEvent.blocked
                      ? 'url(#p1-red)'
                      : 'url(#p1-cyan)'
                    : 'url(#p1-muted)'
                }
              />
              <line
                x1="388"
                y1="334"
                x2="418"
                y2="334"
                stroke={safeIdx >= 2 ? COLOR_DATA : '#cbd5e1'}
                strokeWidth="2"
                strokeDasharray="4 3"
                markerEnd={safeIdx >= 2 ? 'url(#p1-green)' : 'url(#p1-muted)'}
              />
              <line
                x1="560"
                y1="332"
                x2="628"
                y2="332"
                stroke={activeEvent.phase === '実行時' ? activeEvent.color : '#94a3b8'}
                strokeWidth={activeEvent.phase === '実行時' ? 2.6 : 1.5}
                markerEnd={
                  activeEvent.phase === '実行時'
                    ? activeEvent.blocked
                      ? 'url(#p1-red)'
                      : 'url(#p1-green)'
                    : 'url(#p1-muted)'
                }
              />

              {/* Checkpoint Gate Diamond centered on wire */}
              <g transform={`translate(${packetCoord.midX}, ${packetCoord.midY})`}>
                <rect
                  x="-11"
                  y="-11"
                  width="22"
                  height="22"
                  rx="4"
                  transform="rotate(45)"
                  fill={packetCoord.reachedCheck ? (activeEvent.blocked ? '#fce8e6' : '#e6f4ea') : '#ffffff'}
                  stroke={packetCoord.reachedCheck ? (activeEvent.blocked ? COLOR_DENY : COLOR_DATA) : '#0b57d0'}
                  strokeWidth="2"
                />
                <text
                  y="4.5"
                  textAnchor="middle"
                  fontSize="13"
                  fontWeight="800"
                  fill={packetCoord.reachedCheck ? (activeEvent.blocked ? COLOR_DENY : COLOR_DATA) : '#0b57d0'}
                >
                  {packetCoord.reachedCheck ? (activeEvent.blocked ? '✕' : '✓') : '?'}
                </text>
              </g>

              {/* Moving Packet Dot on wire + Stationary Clear Label Above Wire Gap (ZERO overlap with node boxes!) */}
              <circle cx={packetCoord.x} cy={packetCoord.y} r="6" fill={activeEvent.color} stroke="#ffffff" strokeWidth="1.5" />
              <g transform={`translate(${packetCoord.midX}, ${packetCoord.midY - 56})`}>
                <rect x="-74" y="-13" width="148" height="26" rx="13" fill={activeEvent.color} />
                <text x="0" y="4.5" textAnchor="middle" fontSize="12.5" fontWeight="700" fill="#ffffff">
                  {activeEvent.packetLabel}
                </text>
              </g>
            </svg>
          ) : (
            /* DESKTOP SEQUENCE VIEW */
            <svg className="blueprint-svg" viewBox="0 0 820 410" role="img" aria-label="時系列シーケンス図">
              <title>Cloud Run 権限チェック時系列シーケンス</title>
              <defs>
                <marker id="seq-ok" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                  <path d="M0 1l8 4-8 4z" fill={COLOR_DATA} />
                </marker>
                <marker id="seq-deny" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                  <path d="M0 1l8 4-8 4z" fill={COLOR_DENY} />
                </marker>
              </defs>

              {SEQ_COLS.map((col) => (
                <g key={col.key}>
                  <rect x={col.x - 66} y="16" width="132" height="52" rx="9" fill="#ffffff" stroke="#c4c7c5" strokeWidth="1.4" />
                  <text x={col.x} y="38" textAnchor="middle" fontSize="14" fontWeight="700" fill="#1f1f1f">
                    {col.label}
                  </text>
                  <text x={col.x} y="57" textAnchor="middle" fontSize="12" fill="#5f6368">
                    {col.sub}
                  </text>
                  <line x1={col.x} y1="68" x2={col.x} y2="390" stroke="#cbd5e1" strokeWidth="1.5" strokeDasharray="5 5" />
                </g>
              ))}

              {scenario.events.map((ev, idx) => {
                const y = 114 + idx * 72;
                const x1 = seqX(ev.fromKey);
                const x2 = seqX(ev.toKey);
                const isCurrent = idx === safeIdx;
                const isPast = idx < safeIdx;
                const lineColor = ev.blocked ? COLOR_DENY : ev.color;
                const activeEnd = isCurrent ? x1 + (x2 - x1) * progress : x2;

                return (
                  <g
                    key={ev.id}
                    opacity={idx > safeIdx ? 0.3 : 1}
                    style={{ cursor: 'pointer' }}
                    onClick={() => {
                      setIsPlaying(false);
                      setStepIdx(idx);
                    }}
                  >
                    {isCurrent && (
                      <rect x="12" y={y - 26} width="796" height="56" rx="8" fill={ev.blocked ? '#fce8e6' : '#d3e3fd'} opacity="0.55" />
                    )}
                    <text x="18" y={y + 4} fontSize="12.5" fontWeight="700" fill="#5f6368" fontFamily="ui-monospace, monospace">
                      {ev.time}
                    </text>
                    <line
                      x1={x1}
                      y1={y}
                      x2={isPast || isCurrent ? activeEnd : x2}
                      y2={y}
                      stroke={lineColor}
                      strokeWidth={isCurrent ? 3 : 2}
                      markerEnd={ev.blocked ? 'url(#seq-deny)' : 'url(#seq-ok)'}
                    />
                    <rect x={(x1 + x2) / 2 - 96} y={y - 23} width="192" height="22" rx="11" fill="#ffffff" stroke={lineColor} strokeWidth="1.3" />
                    <text x={(x1 + x2) / 2} y={y - 8} textAnchor="middle" fontSize="12" fontWeight="700" fill={lineColor}>
                      {ev.packetLabel}（{ev.status.split('・')[0]}）
                    </text>
                  </g>
                );
              })}
            </svg>
          )}
        </div>

        {/* Unified Playback Bar directly underneath the diagram */}
        <PlaybackBar
          isPlaying={isPlaying}
          onTogglePlay={handleTogglePlay}
          onPrev={handleStepPrev}
          prevDisabled={safeIdx === 0}
          onNext={handleStepNext}
          nextLabel="ステップ"
          speed={speed}
          onChangeSpeed={setSpeed}
          onReset={handleReset}
        />
      </div>

      {/* Compact Event Flow Trace Table */}
      <div className="trace-card">
        <div className="trace-bar">
          <h2 className="trace-heading">イベントの流れ</h2>
          <div className="legend-row" aria-hidden="true">
            <span className="legend-dot" style={{ color: COLOR_CONTROL }}>設定時</span>
            <span className="legend-dot" style={{ color: COLOR_INGRESS }}>入口認証</span>
            <span className="legend-dot" style={{ color: COLOR_DATA }}>実行時</span>
            <span className="legend-dot" style={{ color: COLOR_DENY }}>403 拒否</span>
          </div>
        </div>

        <div className="trace-table-wrap">
          <table className="trace-table">
            <caption className="visually-hidden">Cloud Run 権限評価イベントログ</caption>
            <thead>
              <tr>
                <th scope="col" className="col-no">#</th>
                <th scope="col" className="col-time">時刻</th>
                <th scope="col">送信元 → 宛先</th>
                <th scope="col">確認ポイント</th>
                <th scope="col">結果</th>
              </tr>
            </thead>
            <tbody>
              {scenario.events.map((ev, idx) => (
                <tr
                  key={ev.id}
                  className={`trace-row ${idx === safeIdx ? 'active' : idx > safeIdx ? 'pending' : ''}`}
                  onClick={() => {
                    setIsPlaying(false);
                    setStepIdx(idx);
                  }}
                >
                  <td className="col-no">
                    <span className="trace-badge" style={{ background: ev.color }}>
                      {ev.id}
                    </span>
                  </td>
                  <td className="mono col-time">{ev.time}</td>
                  <td>
                    <span className="trace-route-from">{ev.from}</span>
                    <span className="trace-route-to">→ {ev.to}</span>
                  </td>
                  <td className="mono" style={{ fontSize: '0.76rem' }}>
                    {ev.checkLabel}
                  </td>
                  <td>
                    <span className={`status-chip ${ev.tone}`}>{ev.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
