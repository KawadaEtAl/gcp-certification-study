import { useEffect, useState } from 'react';
import { Check, Clock, KeyRound } from 'lucide-react';
import type { StepInsight } from '../types';
import { useIsMobile } from '../hooks/useIsMobile';
import { PlaybackBar } from '../components/PlaybackBar';

type FocusLane = 'cloudrun' | 'wif' | 'static-key';
type ViewMode = 'lifecycle' | 'token-diff';

interface Part2Props {
  onStepInsightChange: (insight: StepInsight) => void;
}

const MAX_MINUTES = 240; // 4 hours simulation
const LEAK_MINUTE = 40;

const LANES: { id: FocusLane; label: string; dotTone: 'allow' | 'info' | 'deny' }[] = [
  { id: 'cloudrun', label: 'Cloud Run (ADC)', dotTone: 'allow' },
  { id: 'wif', label: '外部 CI (WIF)', dotTone: 'info' },
  { id: 'static-key', label: '静的 JSON キー', dotTone: 'deny' },
];

export function Part2KeylessAuthViz({ onStepInsightChange }: Part2Props) {
  const isMobile = useIsMobile();
  const [viewMode, setViewMode] = useState<ViewMode>('lifecycle');
  const [focusLane, setFocusLane] = useState<FocusLane>('cloudrun');
  const [minutes, setMinutes] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);

  useEffect(() => {
    if (!isPlaying) return;
    const interval = window.setInterval(() => {
      setMinutes((prev) => {
        if (prev >= MAX_MINUTES) {
          setIsPlaying(false);
          return MAX_MINUTES;
        }
        return Math.min(MAX_MINUTES, prev + 2 * speed);
      });
    }, 120);
    return () => window.clearInterval(interval);
  }, [isPlaying, speed]);

  const leaked = minutes >= LEAK_MINUTE;
  const leakedShortTokenExpired = minutes >= 60;
  const currentTokenGen = Math.floor(minutes / 55) + 1;
  const remainingTtl = 60 - (minutes % 55);

  const fmtTime = (m: number) => `${Math.floor(m / 60)}:${String(Math.floor(m % 60)).padStart(2, '0')}`;

  useEffect(() => {
    if (viewMode === 'token-diff') {
      onStepInsightChange({
        stepNumber: 1,
        totalSteps: 2,
        badge: 'トークン構造比較',
        title: 'ID トークン vs OAuth アクセストークン',
        subtitle: '「Cloud Run を呼ぶ鍵」と「Google API を叩く鍵」は別物',
        explanation:
          'Cloud Run の非公開入口へ送るのは OIDC ID トークン（対象サービスURLが `aud` に入る）。一方、コンテナ内から Cloud Storage や Secret Manager を呼ぶのは OAuth 2.0 アクセストークンです。',
        kvPairs: [
          { label: 'ID トークン', value: 'Cloud Run 入口認証（aud = サービスURL）', tone: 'info' },
          { label: 'OAuth トークン', value: 'GCP API 呼出し（Storage 等）', tone: 'allow' },
          { label: '有効期限', value: 'どちらも短命（約1時間・自動更新）', tone: 'allow' },
        ],
        payloadTitle: 'OIDC ID トークン（JWT デコード例）',
        payloadJson: JSON.stringify(
          {
            iss: 'https://accounts.google.com',
            aud: 'https://manual-rag-xxxx.a.run.app',
            email: 'sa-internal-app@study.iam.gserviceaccount.com',
            email_verified: true,
            iat: 1795740000,
            exp: 1795743600,
          },
          null,
          2,
        ),
      });
      return;
    }

    if (focusLane === 'cloudrun') {
      onStepInsightChange({
        stepNumber: 1,
        totalSteps: 3,
        badge: `時刻 ${fmtTime(minutes)}・Cloud Run ADC`,
        title: 'Cloud Run：メタデータサーバーからの短命トークン',
        subtitle: '鍵ファイルゼロ。ADC が 169.254.169.254 から自動更新する',
        explanation: leakedShortTokenExpired
          ? '0:40 に漏えいした Token #1 は 1:00 で自動失効（401）しました。一方コンテナ本体の ADC は 0:55 に Token #2 へ自動切り替え済みなのでサービスは止まらず、攻撃者だけ締め出されます。'
          : leaked
          ? '0:40 に仮にトークン文字列が漏えいしても、有効期限は 1:00 まで（残り20分）。時間が進めば自動で無効化されます。'
          : 'Cloud Run コンテナは起動時に鍵を持たず、ADC が `metadata.google.internal` へ問い合わせて実行時SAの短命トークンを取得します。',
        kvPairs: [
          { label: '現在時刻', value: fmtTime(minutes) },
          { label: '稼働トークン', value: `Token #${currentTokenGen}（残 ${remainingTtl}分）`, tone: 'allow' },
          {
            label: '漏えい分 #1',
            value: !leaked ? '未漏えい' : leakedShortTokenExpired ? '自動失効済（401 安全）' : '一時有効（1:00で失効）',
            tone: !leaked || leakedShortTokenExpired ? 'allow' : 'warn',
          },
        ],
        payloadTitle: 'メタデータサーバー取得レスポンス',
        payloadJson: JSON.stringify(
          {
            endpoint: 'http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token',
            header: { 'Metadata-Flavor': 'Google' },
            response: {
              token_type: 'Bearer',
              expires_in: remainingTtl * 60,
              generation: currentTokenGen,
            },
          },
          null,
          2,
        ),
      });
    } else if (focusLane === 'wif') {
      onStepInsightChange({
        stepNumber: 2,
        totalSteps: 3,
        badge: `時刻 ${fmtTime(minutes)}・外部 CI (WIF)`,
        title: '外部 CI：Workload Identity Federation（OIDC → STS）',
        subtitle: 'GitHub Actions 等の OIDC トークンを Google Cloud STS で短命認証情報に交換',
        explanation:
          '外部 CI には GCP のメタデータサーバーが存在しません。信頼済み IdP の OIDC トークンを STS へ渡し、`attributeCondition` でリポジトリ・ブランチを絞って短命認証情報へ交換します。',
        kvPairs: [
          { label: '取得経路', value: 'External OIDC → Google Cloud STS' },
          { label: '属性絞り込み', value: 'repo == KawadaEtAl/gcp-study && ref == main', tone: 'info' },
          {
            label: '漏えい時',
            value: !leaked ? '未漏えい' : leakedShortTokenExpired ? '短命のため失効済（401）' : '残寿命のみ有効',
            tone: !leaked || leakedShortTokenExpired ? 'allow' : 'warn',
          },
        ],
        payloadTitle: 'WIF 属性条件（Attribute Condition）',
        payloadJson: JSON.stringify(
          {
            issuer: 'https://token.actions.githubusercontent.com',
            attributeCondition:
              "assertion.repository == 'KawadaEtAl/gcp-certification-study' && assertion.ref == 'refs/heads/main'",
            exchangedCredential: 'Short-lived STS Token (TTL 3600s)',
          },
          null,
          2,
        ),
      });
    } else {
      onStepInsightChange({
        stepNumber: 3,
        totalSteps: 3,
        badge: `時刻 ${fmtTime(minutes)}・アンチパターン`,
        title: '静的 JSON キー：漏えいすると手動削除まで無期限に悪用可能',
        subtitle: '期限切れが来ないため、4時間後も数か月後も攻撃者が API を叩き続けられる',
        explanation: leaked
          ? `0:40 に流出した JSON 秘密鍵は、${fmtTime(minutes)} の時点でも依然として有効（200 OK）です。管理者が気づいて手動で無効化・削除するまで被害が止まりません。`
          : '静的なサービスアカウント JSON キーは秘密鍵そのものです。再生して 0:40 の漏えいイベント以降、短命トークンとの寿命差を比べてみてください。',
        kvPairs: [
          { label: '有効期限 (TTL)', value: '無期限（手動削除まで ∞）', tone: 'deny' },
          {
            label: '漏えい後の状態',
            value: leaked ? '悪用可能（200 OK 継続中）' : '漏えい前（リスク潜在）',
            tone: leaked ? 'deny' : 'warn',
          },
        ],
        payloadTitle: '静的 JSON キー漏えいリスク',
        payloadJson: JSON.stringify(
          {
            type: 'service_account',
            private_key_id: 'a1b2c3d4... (PERMANENT)',
            expires_at: 'NEVER (until manual revocation)',
            attackerAccessAtCurrentTime: leaked ? 'ALLOWED (200 OK)' : 'N/A',
          },
          null,
          2,
        ),
      });
    }
  }, [viewMode, focusLane, minutes, leaked, leakedShortTokenExpired, currentTokenGen, remainingTtl, onStepInsightChange]);

  /* Desktop timeline leaves 34px right margin (272..784) so Token #5 is never clipped */
  const timeToX = (m: number) => 274 + (m / MAX_MINUTES) * 504;
  const mobileTimeToX = (m: number) => 24 + (m / MAX_MINUTES) * 332;
  const cursorX = timeToX(minutes);
  const mobileCursorX = mobileTimeToX(minutes);

  return (
    <div className="viz-workspace">
      <div className="canvas-card">
        <div className="canvas-toolbar">
          <div className="segmented" role="group" aria-label="表示切替">
            <button
              type="button"
              className="seg-btn"
              aria-pressed={viewMode === 'lifecycle'}
              onClick={() => setViewMode('lifecycle')}
            >
              <Clock size={14} aria-hidden="true" />
              寿命タイムライン
            </button>
            <button
              type="button"
              className="seg-btn"
              aria-pressed={viewMode === 'token-diff'}
              onClick={() => setViewMode('token-diff')}
            >
              <KeyRound size={14} aria-hidden="true" />
              トークン比較
            </button>
          </div>

          {viewMode === 'lifecycle' && (
            <div className="toolbar-group">
              <span className="toolbar-label">注目環境:</span>
              <div className="scenario-bar" role="group" aria-label="詳細を見るレーン">
                {LANES.map((lane) => {
                  const selected = focusLane === lane.id;
                  return (
                    <button
                      key={lane.id}
                      type="button"
                      className="scenario-pill"
                      aria-pressed={selected}
                      onClick={() => setFocusLane(lane.id)}
                    >
                      {selected ? (
                        <Check size={14} strokeWidth={2.5} aria-hidden="true" />
                      ) : (
                        <span className={`chip-dot ${lane.dotTone}`} aria-hidden="true" />
                      )}
                      {lane.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="blueprint-stage">
          {isMobile && viewMode === 'lifecycle' ? (
            /* 1:1 PORTRAIT MOBILE TIMELINE */
            <svg className="blueprint-svg" viewBox="0 0 380 498" role="img" aria-label="3環境の認証情報ライフサイクル比較">
              <title>短命トークンと静的JSONキーの寿命比較（モバイル）</title>
              <text x="16" y="20" fontSize="13" fontWeight="700" fill="#0b57d0">
                認証情報の寿命タイムライン（0:00 → 4:00）
              </text>

              {[0, 60, 120, 180, 240].map((m) => (
                <g key={m}>
                  <line x1={mobileTimeToX(m)} y1="58" x2={mobileTimeToX(m)} y2="466" stroke="#dce5f2" strokeWidth="1.2" strokeDasharray="4 4" />
                  <text x={mobileTimeToX(m)} y="486" textAnchor="middle" fontSize="12.5" fontWeight="650" fill="#5f6368" fontFamily="ui-monospace, monospace">
                    {fmtTime(m)}
                  </text>
                </g>
              ))}

              {/* Leak marker in dedicated lower lane (y=58) */}
              <line x1={mobileTimeToX(LEAK_MINUTE)} y1="58" x2={mobileTimeToX(LEAK_MINUTE)} y2="466" stroke="#c5221f" strokeWidth="1.8" strokeDasharray="5 3" />
              <rect x={mobileTimeToX(LEAK_MINUTE) - 10} y="58" width="116" height="22" rx="11" fill="#fce8e6" stroke="#c5221f" />
              <text x={mobileTimeToX(LEAK_MINUTE) + 48} y="73" textAnchor="middle" fontSize="12" fontWeight="700" fill="#c5221f">
                0:40 漏えい発生
              </text>

              {/* Lane 1 */}
              <g style={{ cursor: 'pointer' }} onClick={() => setFocusLane('cloudrun')}>
                <rect x="10" y="92" width="360" height="116" rx="12" fill={focusLane === 'cloudrun' ? '#f1fbf6' : '#ffffff'} stroke={focusLane === 'cloudrun' ? '#137333' : '#d5dfef'} strokeWidth={focusLane === 'cloudrun' ? 2 : 1.2} />
                <text x="24" y="116" fontSize="15" fontWeight="700" fill="#1f1f1f">1. Cloud Run（ADC 自動更新）</text>
                <text x="24" y="135" fontSize="12.5" fill="#137333">漏えい #1 は 1:00 で失効・本体は継続</text>
                {[0, 55, 110, 165].map((startM, idx) => {
                  const endM = Math.min(MAX_MINUTES, startM + 60);
                  const x1 = mobileTimeToX(startM);
                  const w = Math.max(24, mobileTimeToX(endM) - x1);
                  const isExpired = minutes >= endM;
                  const isActive = minutes >= startM && minutes < endM;
                  return (
                    <g key={startM}>
                      <rect x={x1} y={idx % 2 === 0 ? 146 : 174} width={w} height="24" rx="6" fill={isActive ? '#137333' : isExpired ? '#e2e8f0' : '#ceead6'} stroke={isActive ? '#0d652d' : '#94a3b8'} />
                      <text x={x1 + w / 2} y={idx % 2 === 0 ? 162 : 190} textAnchor="middle" fontSize="12" fontWeight="700" fill={isActive ? '#ffffff' : isExpired ? '#475569' : '#0d652d'} fontFamily="ui-monospace, monospace">
                        {isExpired ? `#${idx + 1}失効` : `Token #${idx + 1}`}
                      </text>
                    </g>
                  );
                })}
              </g>

              {/* Lane 2 */}
              <g style={{ cursor: 'pointer' }} onClick={() => setFocusLane('wif')}>
                <rect x="10" y="220" width="360" height="106" rx="12" fill={focusLane === 'wif' ? '#f1f6ff' : '#ffffff'} stroke={focusLane === 'wif' ? '#0b57d0' : '#d5dfef'} strokeWidth={focusLane === 'wif' ? 2 : 1.2} />
                <text x="24" y="244" fontSize="15" fontWeight="700" fill="#1f1f1f">2. 外部 CI（WIF / STS 短命交換）</text>
                <text x="24" y="263" fontSize="12.5" fill="#0b57d0">ジョブ単位で1時間のみ発行・自動失効</text>
                {[
                  { start: 5, end: 60, label: 'Job#1 (1h)' },
                  { start: 135, end: 190, label: 'Job#2 (1h)' },
                ].map((job) => {
                  const x1 = mobileTimeToX(job.start);
                  const w = mobileTimeToX(job.end) - x1;
                  const active = minutes >= job.start && minutes < job.end;
                  const expired = minutes >= job.end;
                  return (
                    <g key={job.label}>
                      <rect x={x1} y="278" width={w} height="32" rx="7" fill={active ? '#0b57d0' : expired ? '#e2e8f0' : '#d3e3fd'} stroke={active ? '#0b57d0' : '#93c5fd'} />
                      <text x={x1 + w / 2} y="298" textAnchor="middle" fontSize="12" fontWeight="700" fill={active ? '#ffffff' : expired ? '#475569' : '#041e49'} fontFamily="ui-monospace, monospace">
                        {expired ? '失効済' : job.label}
                      </text>
                    </g>
                  );
                })}
              </g>

              {/* Lane 3 */}
              <g style={{ cursor: 'pointer' }} onClick={() => setFocusLane('static-key')}>
                <rect x="10" y="338" width="360" height="114" rx="12" fill={focusLane === 'static-key' ? '#fff5f5' : '#ffffff'} stroke={focusLane === 'static-key' ? '#c5221f' : '#d5dfef'} strokeWidth={focusLane === 'static-key' ? 2 : 1.2} />
                <text x="24" y="362" fontSize="15" fontWeight="700" fill="#1f1f1f">3. 静的 JSON キー（TTL = ∞）</text>
                <text x="24" y="381" fontSize="12.5" fill="#c5221f">漏えい後も手動削除までずっと悪用可能</text>
                <rect x={mobileTimeToX(0)} y="398" width={mobileTimeToX(LEAK_MINUTE) - mobileTimeToX(0)} height="36" rx="7" fill="#fef7e0" stroke="#b06000" />
                <text x={(mobileTimeToX(0) + mobileTimeToX(LEAK_MINUTE)) / 2} y="420" textAnchor="middle" fontSize="12" fontWeight="700" fill="#7c4300">key</text>
                <rect x={mobileTimeToX(LEAK_MINUTE)} y="398" width={mobileTimeToX(MAX_MINUTES) - mobileTimeToX(LEAK_MINUTE)} height="36" rx="7" fill={leaked ? '#c5221f' : '#fce8e6'} stroke="#c5221f" />
                <text x={(mobileTimeToX(LEAK_MINUTE) + mobileTimeToX(MAX_MINUTES)) / 2} y="421" textAnchor="middle" fontSize="13" fontWeight="700" fill={leaked ? '#ffffff' : '#a50e0e'}>
                  {leaked ? `悪用可能が継続中 (${fmtTime(minutes)}・∞)` : '手動削除まで無期限に有効 (∞)'}
                </text>
              </g>

              {/* Playhead in dedicated top lane (y=30) */}
              <g transform={`translate(${mobileCursorX}, 0)`}>
                <line x1="0" y1="52" x2="0" y2="466" stroke="#1f1f1f" strokeWidth="2.2" />
                <rect x="-26" y="30" width="52" height="22" rx="6" fill="#1f1f1f" />
                <text x="0" y="45" textAnchor="middle" fontSize="12" fontWeight="700" fill="#ffffff" fontFamily="ui-monospace, monospace">
                  {fmtTime(minutes)}
                </text>
              </g>
            </svg>
          ) : isMobile && viewMode === 'token-diff' ? (
            <svg className="blueprint-svg" viewBox="0 0 380 640" role="img" aria-label="IDトークンとOAuthアクセストークンの違い">
              <title>IDトークンとOAuthアクセストークンの違い</title>
              <rect x="12" y="12" width="356" height="300" rx="14" fill="#ffffff" stroke="#0b57d0" strokeWidth="1.8" />
              <text x="26" y="42" fontSize="12.5" fontWeight="700" fill="#0b57d0" fontFamily="ui-monospace, monospace">OIDC ID Token (JWT)</text>
              <text x="26" y="72" fontSize="17" fontWeight="700" fill="#1f1f1f">Cloud Run 入口を呼ぶ鍵</text>
              {[
                { k: 'aud (宛先)', v: '対象 Cloud Run の URL 一致必須' },
                { k: 'email / sub', v: 'roles/run.invoker 判定に使う主体' },
                { k: 'exp (有効期限)', v: '発行から 1 時間（短命）' },
              ].map((row, idx) => (
                <g key={row.k} transform={`translate(26, ${92 + idx * 68})`}>
                  <rect width="328" height="58" rx="9" fill="#f8fafd" stroke="#e0e3eb" />
                  <text x="12" y="23" fontSize="12.5" fontWeight="700" fill="#0b57d0" fontFamily="ui-monospace, monospace">{row.k}</text>
                  <text x="12" y="44" fontSize="13.5" fontWeight="600" fill="#1f1f1f">{row.v}</text>
                </g>
              ))}

              <rect x="12" y="328" width="356" height="300" rx="14" fill="#ffffff" stroke="#137333" strokeWidth="1.8" />
              <text x="26" y="358" fontSize="12.5" fontWeight="700" fill="#137333" fontFamily="ui-monospace, monospace">OAuth 2.0 Access Token</text>
              <text x="26" y="388" fontSize="17" fontWeight="700" fill="#1f1f1f">Google Cloud API を叩く鍵</text>
              {[
                { k: '主体 (Runtime SA)', v: 'メタデータサーバー経由で自動取得' },
                { k: 'scope', v: '実許可はバケット等の IAM で判定' },
                { k: 'exp (有効期限)', v: '約 1 時間（ADC が裏で自動更新）' },
              ].map((row, idx) => (
                <g key={row.k} transform={`translate(26, ${408 + idx * 68})`}>
                  <rect width="328" height="58" rx="9" fill="#f8fafd" stroke="#e0e3eb" />
                  <text x="12" y="23" fontSize="12.5" fontWeight="700" fill="#137333" fontFamily="ui-monospace, monospace">{row.k}</text>
                  <text x="12" y="44" fontSize="13.5" fontWeight="600" fill="#1f1f1f">{row.v}</text>
                </g>
              ))}
            </svg>
          ) : viewMode === 'lifecycle' ? (
            /* DESKTOP TIMELINE: 2 dedicated label lanes (Playhead y=30, Leak y=58), 34px right margin, larger fonts */
            <svg className="blueprint-svg" viewBox="0 0 820 426" role="img" aria-label="3環境の認証情報ライフサイクル比較">
              <title>短命トークンと静的JSONキーの寿命比較タイムライン</title>

              <text x="22" y="22" fontSize="13.5" fontWeight="700" fill="#5f6368">実行環境</text>
              <text x="274" y="22" fontSize="13.5" fontWeight="700" fill="#0b57d0">
                認証情報の寿命タイムライン（0:00 → 4:00）
              </text>

              {[0, 60, 120, 180, 240].map((m) => (
                <g key={m}>
                  <line x1={timeToX(m)} y1="62" x2={timeToX(m)} y2="394" stroke="#dce5f2" strokeWidth="1.2" strokeDasharray="4 4" />
                  <text x={timeToX(m)} y="414" textAnchor="middle" fontSize="13" fontWeight="650" fill="#5f6368" fontFamily="ui-monospace, monospace">
                    {fmtTime(m)}
                  </text>
                </g>
              ))}

              {/* Leak marker strictly in lower label lane (y=58) */}
              <line x1={timeToX(LEAK_MINUTE)} y1="62" x2={timeToX(LEAK_MINUTE)} y2="394" stroke="#c5221f" strokeWidth="1.8" strokeDasharray="5 3" />
              <rect x={timeToX(LEAK_MINUTE) - 60} y="60" width="120" height="22" rx="11" fill="#fce8e6" stroke="#c5221f" />
              <text x={timeToX(LEAK_MINUTE)} y="75" textAnchor="middle" fontSize="12" fontWeight="700" fill="#c5221f">
                0:40 漏えい発生
              </text>

              {/* LANE 1: Cloud Run ADC (4 clean 1h tokens covering 0:00..4:00 without right-edge squishing) */}
              <g style={{ cursor: 'pointer' }} onClick={() => setFocusLane('cloudrun')}>
                <rect x="16" y="96" width="788" height="90" rx="12" fill={focusLane === 'cloudrun' ? '#f1fbf6' : '#ffffff'} stroke={focusLane === 'cloudrun' ? '#137333' : '#d5dfef'} strokeWidth={focusLane === 'cloudrun' ? 2 : 1.2} />
                <text x="32" y="124" fontSize="15.5" fontWeight="700" fill="#1f1f1f">1. Cloud Run (ADC)</text>
                <text x="32" y="146" fontSize="13" fill="#137333">Metadata Server 自動更新</text>
                <text x="32" y="168" fontSize="12.5" fill="#5f6368">漏えい #1 は 1:00 で失効</text>

                {[0, 55, 110, 165].map((startM, idx) => {
                  const endM = Math.min(MAX_MINUTES, startM + 60);
                  const x1 = timeToX(startM);
                  const w = timeToX(endM) - x1;
                  const isExpired = minutes >= endM;
                  const isActive = minutes >= startM && minutes < endM;
                  return (
                    <g key={startM}>
                      <rect x={x1} y={idx % 2 === 0 ? 110 : 142} width={w} height="28" rx="6" fill={isActive ? '#137333' : isExpired ? '#e2e8f0' : '#ceead6'} stroke={isActive ? '#0d652d' : '#94a3b8'} strokeWidth={isActive ? 1.8 : 1} />
                      <text x={x1 + w / 2} y={idx % 2 === 0 ? 128.5 : 160.5} textAnchor="middle" fontSize="12.5" fontWeight="700" fill={isActive ? '#ffffff' : isExpired ? '#475569' : '#0d652d'} fontFamily="ui-monospace, monospace">
                        {isExpired ? `#${idx + 1} 失効` : `Token #${idx + 1}`}
                      </text>
                    </g>
                  );
                })}
              </g>

              {/* LANE 2: External CI (WIF) */}
              <g style={{ cursor: 'pointer' }} onClick={() => setFocusLane('wif')}>
                <rect x="16" y="198" width="788" height="88" rx="12" fill={focusLane === 'wif' ? '#f1f6ff' : '#ffffff'} stroke={focusLane === 'wif' ? '#0b57d0' : '#d5dfef'} strokeWidth={focusLane === 'wif' ? 2 : 1.2} />
                <text x="32" y="226" fontSize="15.5" fontWeight="700" fill="#1f1f1f">2. 外部 CI (WIF)</text>
                <text x="32" y="248" fontSize="13" fill="#0b57d0">OIDC → STS 短命交換</text>
                <text x="32" y="269" fontSize="12.5" fill="#5f6368">ジョブ実行時のみ発行</text>

                {[
                  { start: 5, end: 60, label: 'CI Job #1 (1h)' },
                  { start: 135, end: 190, label: 'CI Job #2 (1h)' },
                ].map((job) => {
                  const x1 = timeToX(job.start);
                  const w = timeToX(job.end) - x1;
                  const active = minutes >= job.start && minutes < job.end;
                  const expired = minutes >= job.end;
                  return (
                    <g key={job.label}>
                      <rect x={x1} y="226" width={w} height="32" rx="7" fill={active ? '#0b57d0' : expired ? '#e2e8f0' : '#d3e3fd'} stroke={active ? '#0b57d0' : '#93c5fd'} strokeWidth="1.4" />
                      <text x={x1 + w / 2} y="246.5" textAnchor="middle" fontSize="12.5" fontWeight="700" fill={active ? '#ffffff' : expired ? '#475569' : '#041e49'} fontFamily="ui-monospace, monospace">
                        {expired ? '失効済 (401)' : job.label}
                      </text>
                    </g>
                  );
                })}
              </g>

              {/* LANE 3: Static JSON Key */}
              <g style={{ cursor: 'pointer' }} onClick={() => setFocusLane('static-key')}>
                <rect x="16" y="298" width="788" height="88" rx="12" fill={focusLane === 'static-key' ? '#fff5f5' : '#ffffff'} stroke={focusLane === 'static-key' ? '#c5221f' : '#d5dfef'} strokeWidth={focusLane === 'static-key' ? 2 : 1.2} />
                <text x="32" y="326" fontSize="15.5" fontWeight="700" fill="#1f1f1f">3. 静的 JSON キー</text>
                <text x="32" y="348" fontSize="13" fill="#c5221f">TTL = ∞（自動失効なし）</text>
                <text x="32" y="369" fontSize="12.5" fill="#5f6368">手動削除まで悪用可能</text>

                <rect x={timeToX(0)} y="326" width={timeToX(LEAK_MINUTE) - timeToX(0)} height="32" rx="6" fill="#fef7e0" stroke="#b06000" />
                <text x={(timeToX(0) + timeToX(LEAK_MINUTE)) / 2} y="346.5" textAnchor="middle" fontSize="12.5" fontWeight="700" fill="#7c4300">key.json</text>

                <rect x={timeToX(LEAK_MINUTE)} y="326" width={timeToX(MAX_MINUTES) - timeToX(LEAK_MINUTE)} height="32" rx="6" fill={leaked ? '#c5221f' : '#fce8e6'} stroke="#c5221f" />
                <text x={(timeToX(LEAK_MINUTE) + timeToX(MAX_MINUTES)) / 2} y="346.5" textAnchor="middle" fontSize="13" fontWeight="700" fill={leaked ? '#ffffff' : '#a50e0e'}>
                  {leaked ? `悪用可能が継続中（${fmtTime(minutes)} 時点でも 200 OK・∞）` : '漏えいすると手動削除まで無期限に有効（∞）'}
                </text>
              </g>

              {/* Playhead strictly in TOP label lane (y=32) — never collides with Leak pill (y=60) */}
              <g transform={`translate(${cursorX}, 0)`}>
                <line x1="0" y1="54" x2="0" y2="394" stroke="#1f1f1f" strokeWidth="2.2" />
                <rect x="-28" y="32" width="56" height="22" rx="6" fill="#1f1f1f" />
                <text x="0" y="47" textAnchor="middle" fontSize="12" fontWeight="700" fill="#ffffff" fontFamily="ui-monospace, monospace">
                  {fmtTime(minutes)}
                </text>
              </g>
            </svg>
          ) : (
            /* DESKTOP TOKEN DIFF */
            <svg className="blueprint-svg" viewBox="0 0 820 410" role="img" aria-label="IDトークンとOAuthアクセストークンの比較">
              <title>IDトークンとOAuthアクセストークンの違い</title>
              <rect x="20" y="20" width="380" height="370" rx="14" fill="#ffffff" stroke="#0b57d0" strokeWidth="1.8" />
              <text x="40" y="54" fontSize="13" fontWeight="700" fill="#0b57d0" fontFamily="ui-monospace, monospace">OIDC ID Token (JWT)</text>
              <text x="40" y="88" fontSize="18" fontWeight="700" fill="#1f1f1f">Cloud Run の入口を呼ぶ鍵</text>
              <text x="40" y="112" fontSize="13.5" fill="#444746">「誰からの呼び出しか」「自分宛てか」を証明</text>
              {[
                { k: 'aud (宛先)', v: 'https://manual-rag-xxx.a.run.app', note: '対象サービスURLと完全一致が必須' },
                { k: 'email / sub', v: 'sa-internal-app@study.iam...', note: 'この主体が roles/run.invoker を持つか判定' },
                { k: 'exp (有効期限)', v: '発行から 1 時間（短命）', note: '期限切れトークンは入口で 401 拒否' },
              ].map((row, idx) => (
                <g key={row.k} transform={`translate(40, ${138 + idx * 78})`}>
                  <rect width="340" height="66" rx="9" fill="#f8fafd" stroke="#e0e3eb" />
                  <text x="12" y="22" fontSize="12.5" fontWeight="700" fill="#0b57d0" fontFamily="ui-monospace, monospace">{row.k}</text>
                  <text x="12" y="41" fontSize="13" fontWeight="650" fill="#1f1f1f" fontFamily="ui-monospace, monospace">{row.v}</text>
                  <text x="12" y="58" fontSize="12" fill="#5f6368">{row.note}</text>
                </g>
              ))}

              <rect x="420" y="20" width="380" height="370" rx="14" fill="#ffffff" stroke="#137333" strokeWidth="1.8" />
              <text x="440" y="54" fontSize="13" fontWeight="700" fill="#137333" fontFamily="ui-monospace, monospace">OAuth 2.0 Access Token</text>
              <text x="440" y="88" fontSize="18" fontWeight="700" fill="#1f1f1f">Google Cloud API を叩く鍵</text>
              <text x="440" y="112" fontSize="13.5" fill="#444746">アプリから Storage / Secret Manager へアクセス</text>
              {[
                { k: '主体 (Runtime SA)', v: 'sa-reader@study.iam...', note: 'メタデータサーバー経由で ADC が自動取得' },
                { k: 'scope', v: 'cloud-platform', note: '実際の許可は対象リソース側の IAM で決まる' },
                { k: 'exp (有効期限)', v: '発行から 1 時間（自動更新）', note: 'クライアントライブラリが裏で自動更新' },
              ].map((row, idx) => (
                <g key={row.k} transform={`translate(440, ${138 + idx * 78})`}>
                  <rect width="340" height="66" rx="9" fill="#f8fafd" stroke="#e0e3eb" />
                  <text x="12" y="22" fontSize="12.5" fontWeight="700" fill="#137333" fontFamily="ui-monospace, monospace">{row.k}</text>
                  <text x="12" y="41" fontSize="13" fontWeight="650" fill="#1f1f1f" fontFamily="ui-monospace, monospace">{row.v}</text>
                  <text x="12" y="58" fontSize="12" fill="#5f6368">{row.note}</text>
                </g>
              ))}
            </svg>
          )}
        </div>

        {/* Unified Playback Bar with integrated slider & quick jump */}
        {viewMode === 'lifecycle' && (
          <>
            <PlaybackBar
              isPlaying={isPlaying}
              onTogglePlay={() => {
                if (!isPlaying && minutes >= MAX_MINUTES) setMinutes(0);
                setIsPlaying((p) => !p);
              }}
              onNext={() => {
                setIsPlaying(false);
                setMinutes((m) => Math.min(MAX_MINUTES, m + 20));
              }}
              nextLabel="+20分"
              speed={speed}
              onChangeSpeed={setSpeed}
              onReset={() => {
                setIsPlaying(false);
                setMinutes(0);
              }}
              sliderValue={minutes}
              sliderMin={0}
              sliderMax={MAX_MINUTES}
              sliderStep={2}
              sliderLabel={`経過 ${fmtTime(minutes)}`}
              sliderAriaLabel="シミュレーション経過時間（分）"
              onSliderChange={(val) => {
                setIsPlaying(false);
                setMinutes(val);
              }}
              quickActionLabel="1:10（漏えい30分後）へ"
              onQuickAction={() => {
                setIsPlaying(false);
                setMinutes(70);
              }}
            />

            <div className="metric-strip">
              <div className="metric-box">
                <span className="metric-label">Cloud Run (ADC)</span>
                <span className="metric-val allow">
                  {leakedShortTokenExpired ? '漏えい分は失効・本体稼働' : `Token #${currentTokenGen} 稼働中`}
                </span>
              </div>
              <div className="metric-box">
                <span className="metric-label">外部 CI (WIF)</span>
                <span className="metric-val info">
                  {leakedShortTokenExpired ? 'STS 失効済（401）' : 'ジョブ単位で短命発行'}
                </span>
              </div>
              <div className="metric-box">
                <span className="metric-label">静的 JSON キー</span>
                <span className={`metric-val ${leaked ? 'deny' : 'warn'}`}>
                  {leaked ? '悪用可能（無期限）' : '無期限キーを保持'}
                </span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
