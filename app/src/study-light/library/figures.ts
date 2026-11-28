import type { ArtName } from '../ui/Art';
import type { Step } from '../ui/StageStrip';

type Variant = { label: string; steps: Step[]; title: string; reason: string };
export interface Figure {
  id: string;
  topic: string;
  title: string;
  question: string;
  source: string;
  url: string;
  variants: Variant[];
}
function step(art: ArtName, label: string, note: string, result?: Step['result']): Step {
  return { art, label, note, result };
}

export const figures: Figure[] = [
  {
    id: 'retry',
    topic: 'PCA　Week 3',
    title: '再試行と二重処理',
    question:
      '注文 A17 の登録は成功しましたが、成功の応答がキューに届きません。同じ依頼がもう一度届くと、注文は何件になりますか？',
    source: 'Cloud Tasks の配信と冪等性',
    url: 'https://docs.cloud.google.com/tasks/docs/dual-overview',
    variants: ['そのまま追加', '注文 ID で重複防止'].map((label, i) => ({
      label,
      steps: [
        step('queue', 'Cloud Tasks', '注文 A17 を送信'),
        step('server', '初回の処理', '1件登録・応答消失'),
        step('server', '再試行', i ? '登録済みと確認' : 'もう1件登録'),
        step('sql', '注文テーブル', i ? '1件のまま' : '2件に重複', i ? 'pass' : 'stop'),
      ],
      title: i ? '同じ依頼が届いても結果は1件' : '配信の再試行が注文の重複につながる',
      reason: i
        ? 'この例では注文 ID を一意なキーにし、未登録の場合だけ原子的に追加します。登録済みなら元の結果を返します。外部への支払いなどは別途、重複防止が必要です。'
        : 'キュー側には登録の成否が分かりません。処理のたびに新しい行を追加すると、同じ注文が2件残ります。',
    })),
  },
  {
    id: 'outbound',
    topic: 'PCA　Week 5',
    title: '外部 IPv4 を持たない VM',
    question:
      '外部 API への送信には、どの条件が必要でしょうか？　インターネット向けの経路があり、ほかの出口はない構成です。',
    source: 'Cloud NAT の概要',
    url: 'https://docs.cloud.google.com/nat/docs/overview',
    variants: ['送信可・変換あり', '送信を拒否', '変換なし'].map((label, i) => ({
      label,
      steps: [
        step('vm', 'Compute Engine', '内部 IPv4 のみ'),
        step('firewall', '送信ルール', i === 1 ? '拒否' : '許可', i === 1 ? 'stop' : 'pass'),
        step(
          'nat',
          'Public NAT',
          ['送信元を変換', '未到達', '対象外'][i],
          i === 1 ? 'unreached' : i === 2 ? 'stop' : 'pass',
        ),
        step('datacenter', '外部 API', i ? '未到達' : '接続', i ? 'unreached' : 'pass'),
      ],
      title: ['VM から始めた接続には応答が返る', '送信の許可が必要', '送信ルールだけでは外部に出られない'][i],
      reason:
        '図は接続条件を確認する順序です。Cloud NAT は分散して動作します。Public NAT は既存の接続への応答を戻せますが、外部から新しい接続を開始する入口にはなりません。',
    })),
  },
  {
    id: 'release',
    topic: 'PCA　Week 13',
    title: '段階リリースの判断',
    question:
      'Cloud Run の新版に5%を配信中です。新版のエラー率が1%を超えたら旧版に戻す運用で、どの判断をしますか？',
    source: 'Cloud Run の段階的な移行とロールバック',
    url: 'https://docs.cloud.google.com/run/docs/rollouts-rollbacks-traffic-migration',
    variants: ['新版 0.2%', '新版 3%', '標本不足'].map((label, i) => ({
      label,
      steps: [
        step('build', 'ビルド', '新版を作成'),
        step('registry', '保管', 'イメージを保存'),
        step('server', '配信', '旧版 95%・新版 5%'),
        step(
          'metrics',
          '観測と判断',
          ['次の段階へ', '旧版へ戻す', '配分を維持'][i],
          i === 1 ? 'stop' : i === 2 ? 'wait' : 'pass',
        ),
      ],
      title: ['次の配分でも新版を観測する', '旧版への配分を100%に戻す', '判断できる件数まで待つ'][i],
      reason:
        'しきい値・配分はこの例の運用ルールです。件数が十分で他の検証にも合格したら配信を広げます。切り戻した後はエラー率と業務処理の回復を確認します。配分の変更でデータの更新は元に戻りません。',
    })),
  },
  {
    id: 'recovery',
    topic: 'PCA　Week 14',
    title: '復旧時間とデータ損失',
    question:
      '停止は30分まで（RTO）、データの欠落は5分まで（RPO）許容します。10時に停止した場合、どの復旧案なら両方を満たしますか？',
    source: 'Google Cloud の障害復旧計画',
    url: 'https://docs.cloud.google.com/architecture/dr-scenarios-planning-guide',
    variants: [
      [15, 20],
      [3, 45],
      [5, 30],
    ].map(([gap, duration], i) => ({
      label: ['復旧案 A', '復旧案 B', '復旧案 C'][i],
      steps: [
        step('backup', '復元できる時点', '09:' + (60 - gap)),
        step('alert', 'サービス停止', '10:00'),
        step('region', '別地域で復元', 'データと機能を検証'),
        step('metrics', '業務再開', '10:' + duration),
      ],
      title: 'RPO ' + (gap <= 5 ? '達成' : '超過') + '　／　RTO ' + (duration <= 30 ? '達成' : '超過'),
      reason:
        '停止時刻から過去にさかのぼると、欠落しうるデータは' +
        gap +
        '分間。停止から業務再開までの時間は' +
        duration +
        '分です。いずれも演習用の時刻です。',
    })),
  },
  {
    id: 'context',
    topic: 'PAA　分野 3.1',
    title: '会話をまたぐ記憶',
    question:
      '利用者 A は「説明は短く」と伝えました。同じ人の別の会話や、利用者 B の会話にも、この希望を使えるでしょうか？',
    source: 'ADK のセッション・状態・記憶',
    url: 'https://adk.dev/sessions/',
    variants: ['同じ会話', '別の会話', '別の利用者'].map((label, i) => ({
      label,
      steps: [
        step('user', '利用者', i === 2 ? 'B' : 'A'),
        step('session', '会話の履歴', i ? '新しい会話' : '希望の記録あり'),
        step('memory', '長期記憶', ['検索不要', 'A の希望を取得', 'A は検索対象外'][i]),
        step('agent', '応答', i === 2 ? '標準の長さ' : '短く説明'),
      ],
      title: ['同じ会話の履歴を使う', '会話をまたぐために記憶を検索する', 'A の希望を B に適用しない'][i],
      reason:
        'この例では希望を本人の同意のもと利用者別に保存し、新しい会話で検索します。履歴、ユーザー単位の状態、長期記憶はそれぞれ別に設計できます。',
    })),
  },
  {
    id: 'rag',
    topic: 'PAA　分野 3.2',
    title: '検索候補と回答の根拠',
    question:
      '「返品期限は？」に答えるため、検索で得た上位2件を並べ直し、1件だけモデルに渡します。返品規定が3位だったらどうなるでしょうか？',
    source: '検索後の再ランキング',
    url: 'https://docs.cloud.google.com/generative-ai-app-builder/docs/ranking',
    variants: ['規定は2位', '規定は3位'].map((label, i) => ({
      label,
      steps: [
        step('vector-index', '索引', '送料・返品・支払'),
        step('retrieval', '上位2件', i ? '送料、支払' : '送料、返品'),
        step('rerank', '再ランキング', i ? '送料が1位' : '返品が1位'),
        step('grounding', '回答', i ? '根拠なし・保留' : '規定を引用', i ? 'wait' : 'pass'),
      ],
      title: i ? '候補にない規定は、並べ直しても戻らない' : '候補に入れば、順位を上げられる',
      reason:
        '順位は架空です。原本文書の取り込み、候補への採用、順位、回答への反映を順に確認します。このアプリは根拠がないときに回答を保留します。',
    })),
  },
  {
    id: 'evaluation',
    topic: 'PAA　分野 4.1',
    title: '回答とツール実行の評価',
    question:
      '在庫を確認して「3個」と答えるテストです。表示された個数が合っていても、不合格になるのはどんなときでしょうか？',
    source: 'ADK のエージェント評価',
    url: 'https://adk.dev/evaluate/',
    variants: ['照会のみ', '照会せず推測', '不要な更新'].map((label, i) => ({
      label,
      steps: [
        step('prompt', '依頼', '在庫を確認'),
        step('trace', '実行履歴', ['在庫照会', '呼び出しなし', '照会＋在庫更新'][i]),
        step('agent', '最終回答', '3個と回答'),
        step('evaluation', 'テスト結果', i ? '実行手順が不合格' : '両方に合格', i ? 'stop' : 'pass'),
      ],
      title: ['照会の記録と回答が一致', '偶然合った回答では確認にならない', '依頼にない更新を検出する'][i],
      reason:
        'このテストでは「対象商品の在庫を照会し、更新しない」と「3個と答える」を別々に判定します。実行履歴にはツール名、引数、戻り値も残します。',
    })),
  },
  {
    id: 'approval',
    topic: 'PAA　分野 5.2',
    title: '人の承認と実行権限',
    question:
      'エージェントが注文 A17 の返金を提案しました。人の承認と API の権限を別々に確認する設計では、どこで実行が止まりますか？',
    source: 'ADK のツール実行前の確認',
    url: 'https://adk.dev/tools-custom/confirmation/',
    variants: ['承認待ち', '権限なし', '両方あり'].map((label, i) => ({
      label,
      steps: [
        step('agent', '提案', 'A17 に返金'),
        step('approval', '人の判断', i ? '承認済み' : '承認待ち', i ? 'pass' : 'wait'),
        step(
          'policy',
          '実行 ID の権限',
          ['未到達', '拒否', '許可'][i],
          i === 0 ? 'unreached' : i === 1 ? 'stop' : 'pass',
        ),
        step('tool', '返金処理', i === 2 ? '実行' : '未実行', i === 2 ? 'pass' : 'unreached'),
      ],
      title: ['確認が終わるまで保留する', '人が承認しても実行権限は増えない', '承認された内容で実行する'][i],
      reason:
        '架空の返金アプリの設計例です。注文 ID と金額を承認に結び付け、変更時には再確認します。API 側で権限を確認し、再試行時の二重返金も防ぎます。',
    })),
  },
];
