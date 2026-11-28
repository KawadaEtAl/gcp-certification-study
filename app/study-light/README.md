# Study Light 学習サイト設計ガイド

**学習者が図を指でたどりながら、誰が何を使い、どこに働きかけ、結果がどう変わるかを説明できることを目指す。** 情報量に上限を設けない。問いを解くのに必要な登場人物・中間処理・関係・例外を残し、配置、線、文字の強弱で読み順を作る。再生や画面の切り替えをしなくても、全体像と比較の根拠が分かるようにする。

このブランチは、Gemini 4 Neon が今後の教材制作で参照できるデザイン案。Week 1 の4単元と Week 2 の全体図＋4単元が動く。`app/src/data/` の教材を参照し、現行サイト・成績・ラボ環境から独立している。

## 最初に見るもの

1. まず[権限の全体図](reference/topology-1280.png)と[スマホ版](reference/topology-390.png)を見る。次に[呼び出しを拒否した図](reference/blocked.png)、[付与と継承](reference/scope.png)、[サービスとジョブ](reference/week2.png)を開く。比較に集中する画面も[PC](reference/w01-p1-1280.png)と[スマホ](reference/w01-p1-390.png)で確認する。
2. [単元の登録例](../src/study-light/examples/catalog.tsx)から、目的に近い図解を開く。
3. [公開する部品](../src/study-light/ui/index.ts)、[共通の値](../src/study-light/tokens.css)、[スタイル](../src/study-light/study.css)を使う。別の週のためにページやCSS全体を複製しない。

現行のチェックアウトを切り替えずに読むには、同じリポジトリで以下を実行する。画像やアプリを開く場合は、2行目で表示される該当ブランチの作業ディレクトリを使う。

```sh
git show codex/study-light-design-system:app/study-light/README.md
git worktree list
```

## 見本を起動する

このブランチのルートから実行する。Node.js 22 以上を想定。`npm ci` は依存関係が未導入の場合に使う。

```sh
cd app
npm ci
npm run study
```

[全体図・比較・拡大](http://127.0.0.1:4198/#w01-p1/0) ／ [認証](http://127.0.0.1:4198/#w01-p2/0) ／ [階層と継承](http://127.0.0.1:4198/#w01-p3/0) ／ [Week 2の全体図](http://127.0.0.1:4198/#w02-p0/0) ／ [配分の変更](http://127.0.0.1:4198/#w02-p2/0)

ポートが使用中なら `npm run study -- --port 4199` を使い、リンクのポートも変更する。共有するのはURLの `#w02-p2/0` の部分。末尾の番号は図解・例題・解説・ラボの順に0〜3。初版の `#part1/2` なども開ける。

通常の `npm run build` は従来のアプリを `dist/` に、`npm run build:study` は見本を `dist-study-light/` に出力する。公開サイトの入口、配信ワークフロー、元の教材は変更していない。見本は別の保存キー `gcp.study.light.v2.*` を使う。学習済み・ブックマーク・ラボのメモはブラウザ内に保存し、例題の選択・図の状態は同じ単元のタブを行き来する間だけ保持する。

## 学習者が一度に見られるもの

| 目的 | 基本設計 | 避けること |
|---|---|---|
| 違いを見抜く | 同じ比較軸を同じ順に揃える。比較中は選んでいない対象も残す | 順番に開かないと差が分からないタブ、スマホの横スクロール |
| 因果を追う | 図の配置を固定し、注目する経路・説明・比較の強調を同期する。許可・拒否・未到達を文字と記号で区別する | 未到達を失敗と表示する、自動再生で読む速さを決める |
| 言葉の意味を知る | 点線を押すと、その語の定義・たとえ・試験や実務でのポイント・関連語が開く | 検索し直させる、閉じると最初の場面に戻る |
| 知っていることと結ぶ | 1つのたとえを全場面に通し、対応する操作と、たとえが通用しない点も言葉にする | 場面ごとに違う比喩、比喩だけで仕様を説明する |
| 確かめる | 例題は選んだ肢のすぐ下に根拠を示す。予測・作図・実測・口頭説明につなげる | 誤答理由を省く、コマンドを自動実行する |

### Week 1 Part 1 で残すべき関係

- ①はデプロイ時の設定。開発者が使う `actAs` の対象は実行用のアカウント `sa-reader`。開発者のデプロイ権限は別途必要。
- ②は呼び出し。ポータルのIDに対して、非公開のサービスで呼び出しを許可する。
- ③は読み取り。①で指定した `sa-reader` が今度は権限を使う側になり、`manual-docs` のマニュアルを読む。
- たとえは順に「資料室の担当者を任命」「窓口に依頼」「担当者が書庫で閲覧」。窓口の利用者と書庫に入る担当者のIDは違う。
- 比較の行名で権限とロールを区別する。詳細では同じデータから両方の正式名と説明用JSONを出す。図の秒数は説明に使う時間。設定時の操作は毎回のリクエストで繰り返されない。

新規デプロイを想定し、他の必要条件が揃っている場合の期待値。

| 条件 | デプロイ | 呼び出し | 読み取り |
|---|---|---|---|
| すべて許可 | 許可 | 許可 | 許可 |
| actAs なし | 拒否 | 未到達 | 未到達 |
| Invoker なし | 許可 | 拒否 | 未到達 |
| Object Viewer なし | 許可 | 許可 | 拒否 |

詳細は [サービスID](https://docs.cloud.google.com/run/docs/configuring/services/service-identity)、[サービス間認証](https://docs.cloud.google.com/run/docs/authenticating/service-to-service)、[Storage のロール](https://docs.cloud.google.com/storage/docs/access-control/iam-roles)を参照。

### 図の構造を選ぶ

| 問い | 画面に残す情報 | 操作で変える情報 |
|---|---|---|
| 誰から誰へ、何が渡るか | 双方の名前と ID、番号と矢印、操作、渡すもの、判定。ID の割り当ては別の線で示す | 注目する経路、説明、比較の強調。拒否でも後続の経路は消さず未到達にする |
| 何を根拠に認証できるか | 実行環境ごとの本人確認の根拠、取得方法、権限を使う ID。API の宛先と提示するトークンは別の比較にする | 用語の詳しい説明 |
| どこまで許可が届くか | 組織、フォルダ、プロジェクト、具体的なリソース、比較用の隣の枝。主体とロールは階層図の外にも示す | 付与先と、そこから継承された結果を同時に更新する |
| アプリの版と実行単位はどう違うか | 保管先を起点にサービスとジョブへ分岐。版ごとの配分・台数と、実行ごとのタスク・完了条件を並べる | 週冒頭は静止図。切り戻しと台数計算は個別単元で扱う |

**描く前の手順。** 誰が、どの対象に、何をするかを列挙する。次に、設定・要求・応答・親子・継承のどれを線で結ぶか決める。線の近くに動詞や渡すものを書き、読み手が関係を推測する余地を減らす。最後に、条件を1つ変えても答えを図の上で説明できるか試す。図が混み合うときは関連する要素をまとめ、比較軸を揃える。判断に必要な関係は詳細画面に隠さない。

**単元の組み立て。** 週の冒頭に静的な全体図と前提語5〜8語を置き、各単元はストーリー、例題、図解、解説を基本にする。問いに合わせて順序や形式を変えてよい。この見本は図解を先に開く。ラボは予測・作図・実測・口頭説明を基本にし、実行 ID や設定階層のように実機で見落としやすい要素も扱う。

**内容の境界。** W1 P2 の [ADC](https://docs.cloud.google.com/docs/authentication/application-default-credentials) は認証情報を探す仕組み。[WIF](https://docs.cloud.google.com/iam/docs/workload-identity-federation) の例は外部 ID への直接付与。W1 P3 では [サービスアカウントの2つの役割](https://docs.cloud.google.com/iam/docs/service-account-overview)と[Secret Accessor の範囲](https://docs.cloud.google.com/secret-manager/docs/access-control)を扱う。フォルダは任意。許可なしと明示的な拒否を混同しない。W2 P0 の配分・台数・タスク分担は [Cloud Run のリソースモデル](https://docs.cloud.google.com/run/docs/resource-model)に沿った例で、固定の比率や既定値ではない。

## 見た目と画面幅

- 白い本文、薄いグレーの目次、墨色の文字。薄い緑の面を図に使い、濃い緑は許可、赤茶は拒否を示す。状態には必ず文字と記号を添える。選択中の操作は墨色の塗りか下線で示す。
- 本文は端末標準の日本語ゴシックで16px、行間は約1.8、長文の幅は約47字分。等幅はコードや識別子に限定する。指標の単位、比較の軸名、図のラベルは画像に焼き込まない。
- `tokens.css` の `--ink`・`--muted`・`--surface`・`--nav`・`--figure-bg`・`--accent`・`--green`・`--bad` を役割で選ぶ。余白は基本4px単位。図の角丸は20px、スマホでは16px。
- 1030pxを超えると折りたためる目次と幅1030px以下の本文。1030px以下は目次をダイアログにする。720px以下は比較の各列を1行ずつに組み替える。同じHTMLで読み順・値・用語リンクを保つ。
- 図は線画と白い面、薄緑のアクセントで描く。内製SVGは `Art` の240×196の座標に収める。名称と状態はHTMLで隣に置く。操作アイコンは既存の Lucide を使う。社内フォント、ロゴ、デザインシステムの素材・コード・テーマデータは持ち込まない。

## 部品の選び方

| 教材・操作 | 部品 | 使用例 |
|---|---|---|
| 週の選択、目次、進捗、ブックマーク、4タブ | `StudyShell`・`Unit` | [全単元](../src/study-light/examples/catalog.tsx) |
| 共通軸で2〜3対象を比較 | `Comparison<T>`・`Axis<T>`・`Status` | [W1 P1](../src/study-light/examples/Permissions.tsx)、[W1 P2・P4、W2 P1・P4](../src/study-light/examples/Patterns.tsx) |
| 時間変化と途中停止 | `usePlayback`・`Playback`・`ScenarioSelect` | W1 P1。キーボードで再生位置を移動。用語・詳細、タブ移動、画面非表示で停止 |
| 固定配置の関係図 | `FlowNode`・`FlowEdge` | [W1 P1](../src/study-light/examples/Permissions.tsx)。`area` は CSS Grid の領域名。辺には番号、操作名、読み上げる経路、判定、進捗（0〜1）、選択処理を渡す |
| 階層と付与先 | `ResourceTree`・`TreeItem`・`ChoiceGroup` | [W1 P3](../src/study-light/examples/Hierarchy.tsx)。`items` は子を持つ配列。`annotation(item, parents)` に親のID一覧が渡る。直接付与、継承、対象外を区別する |
| 2方向の分岐 | `Art`・`BranchDiagram` | 1親2子に使う。分岐後も比較したい場合は [W2 P0](../src/study-light/examples/Patterns.tsx) のように、左右の項目を同じ高さに揃える |
| 配分と計算 | `RangeControl`・`RatioBar`・`Insight` | W2 P2・P3。両方の割合と条件を同時に表示 |
| 用語とたとえ | `HelpProvider`・`TermLink`・`GuidedText`・`LessonTerms`・`Analogy` | 全タブ。用語集の `summary / analogy / examPoint / relatedIds` を使用 |
| 詳細・コード・設定画面 | `Modal`・`Inspector`・`CodeBlock`・`Disclosure` | W1 P1の場面名を押す。既存の `ConsoleScreenGallery` は画像がある場合のみ解説に表示 |
| ストーリー、判断の順序、例題、演習 | `Story`・`Explanation`・`Quiz`・`Lab` | `LessonData` から描画。ラボがない週は予測・作図・ミニ確認を使う |

図は省略できる。例えばタグとダイジェストは表記の違いが主題なので、図を2つ並べず文字を揃える。

## PCA・PAA のイラスト

[図解ライブラリ](http://127.0.0.1:4198/#art)から日本語名・サービス名・`ArtName` で検索できる。各イラストを押すと、拡大図・64pxの縮小図・用途・コピーできるJSXが開く。透明背景のSVGとして保存できる。[72点の早見表](reference/art-atlas.png)も参照。

すべて描き起こした図解用の絵。名前はサービスの**役割**を表す。製品名、ID、方向、許可や拒否は絵の隣に文字で示す。箱の個数や絵の中の矢印は実構成の台数・配信順・通信経路を保証しない。

| 分類 | `ArtName` |
|---|---|
| [ネットワーク](http://127.0.0.1:4198/#art/network) | `router`、`firewall`、`load-balancer`、`dns`、`cdn`、`nat`、`vpn`、`interconnect` |
| [配置と実行基盤](http://127.0.0.1:4198/#art/compute) | `vpc`、`zone`、`region`、`datacenter`、`vm`、`cluster`、`pod`、`gpu` |
| [データと復旧](http://127.0.0.1:4198/#art/data) | `sql`、`distributed-db`、`wide-column`、`document-db`、`warehouse`、`cache`、`volume`、`backup` |
| [非同期処理と開発](http://127.0.0.1:4198/#art/delivery) | `queue`、`topic`、`scheduler`、`stream`、`repository`、`build`、`registry`、`plan` |
| [セキュリティと運用](http://127.0.0.1:4198/#art/operations) | `key`、`secret`、`policy`、`audit`、`metrics`、`alert`、`trace`、`billing` |
| [エージェント](http://127.0.0.1:4198/#art/agents) | `agent`、`model`、`workflow`、`tool`、`mcp`、`handoff`、`session`、`memory` |
| [検索と評価](http://127.0.0.1:4198/#art/knowledge) | `documents`、`chunk`、`embedding`、`vector-index`、`retrieval`、`rerank`、`grounding`、`evaluation` |
| [人と実行の統制](http://127.0.0.1:4198/#art/governance) | `user`、`team`、`sandbox`、`skills`、`prompt`、`gateway`、`guardrail`、`approval` |
| [Week 1・2 の基本](http://127.0.0.1:4198/#art/basics) | `laptop`、`portal`、`server`、`identity`、`bucket`、`image`、`job`、`badge` |

### 今後の教材での組み合わせ

[24週計画](../../ROADMAP.md)と、Google Cloud の [PCA 標準試験ガイド](https://services.google.com/fh/files/misc/professional_cloud_architect_exam_guide_english.pdf)・[PAA 試験ガイド](https://services.google.com/fh/files/misc/professional_agentic_architect_exam_guide_english.pdf)を基に選んだ。下表は絵の使い分けの例。リンク先の8本は架空の条件を切り替える見本で、週別の新規単元や公式問題ではない。[PAA のハンズオン](https://cloud.google.com/learn/certification/agentic-architect)は実環境で別に練習する。

| 学習範囲 | 絵にする関係と操作 |
|---|---|
| PCA 第3〜4週 | `scheduler` で起動、`queue` で依頼、`job` で実行。[再試行と二重処理](http://127.0.0.1:4198/#figures/retry)では同じ注文 ID が2回届く。 |
| 第5〜7週 | [VM の外向き通信](http://127.0.0.1:4198/#figures/outbound)。`dns` の問い合わせ、`load-balancer` の振り分け、`nat` の変換を分ける。実行先の比較は `vm / cluster / server`。 |
| 第8〜10週 | `sql / distributed-db / document-db / wide-column / bucket` をアクセスパターンで比較。イベントの分析は `topic → stream → warehouse`、コストと応答時間は `billing / trace`。 |
| 第11〜15週 | `plan / policy / audit` で変更前後を追う。[段階リリース](http://127.0.0.1:4198/#figures/release)と[復旧時間・データ損失](http://127.0.0.1:4198/#figures/recovery)を別の図にする。移行時は旧拠点・接続・移行先を並べ、切り戻せる時点を示す。 |
| 第16〜24週 | ケースごとの制約に合わせ、データの保管場所、モデル、実行環境、評価の絵を組み合わせる。同じ要件に対する2案は `Comparison` で並べる。 |
| PAA 分野1〜2 | `workflow / prompt / documents` で指示と参照元を分ける。`skills / sandbox / mcp` で開発手順、実行環境、ツールへの接続を区別する。 |
| 分野3 | [会話と長期記憶](http://127.0.0.1:4198/#figures/context)、[検索候補と回答の根拠](http://127.0.0.1:4198/#figures/rag)。ツール利用は `mcp / tool`、別のエージェントへの依頼は `handoff`。 |
| 分野4〜5 | [回答と実行履歴の評価](http://127.0.0.1:4198/#figures/evaluation)、[承認と実行権限](http://127.0.0.1:4198/#figures/approval)。`gateway / guardrail / badge / approval` にはそれぞれ仲介する要求、検査対象、実行 ID、承認された操作を添える。 |

### 絵を教材に組み込む

単体の `<Art name="queue" />`、`FlowNode` の `art`、`Comparison` の各項目の `art` に同じ名前を使える。順に並べる場合は [StageStrip](../src/study-light/ui/StageStrip.tsx) に2〜4段階を渡す。矢印は読む順序を示す。複数の主体が行き来する場合は `FlowEdge` で関係を明記する。

```tsx
import { StageStrip } from '../ui';

export function Indexing() {
  return <StageStrip label="文書を検索できるようにする手順" steps={[
    { art: 'documents', label: '原本文書', note: '返品規定 第2版' },
    { art: 'chunk', label: '分割', note: '見出しごとに区切る' },
    { art: 'embedding', label: '埋め込み', note: '各節を数値に変換' },
    { art: 'vector-index', label: '索引', note: '節の ID とともに登録' },
  ]} />;
}
```

- `Art` のみを別のReactアプリで使う場合、[Art.tsx](../src/study-light/ui/Art.tsx) と隣の [art/](../src/study-light/ui/art/) を一緒に置く。幅を指定し高さは自動にする。SVGは装飾扱いのため、意味は隣のテキストで伝える。保存したSVGを単独で使う場合は代替テキストを添える。
- [形と配色](../src/study-light/ui/art/geometry.tsx)を共有する。新しい絵は該当する分類の描画オブジェクトに追加する。`ArtName` は登録キーから導出され、[日本語名・検索語・用途](../src/study-light/library/objects.ts)に不足があれば型チェックで分かる。IDは分類間で重複させない。
- [図解例](../src/study-light/library/figures.ts)は各条件の `steps / title / reason` を同じデータに持つ。判定は `pass / stop / wait / unreached` を指定し、`note` に結果を書く。承認待ちと拒否、未到達を区別する。
- `#art` と `#figures` は週の進捗に含めない。「教材へ戻る」で直前の単元・タブを開く。単元を離れるので再生位置や例題の一時的な選択はリセットする。直接開いたときは Week 1 Part 1 に戻る。

## 新しい週を作る

1. まず既存の教材型と用語集に、単元ID・用語ID・基礎語・根拠・公式リンクを登録する。新しい `LessonId` は既存の網羅的なマップも更新する。用語IDは表示名と別に安定させる。
2. 問いと比較軸を決める。時間が大切な場合だけ再生を追加する。版管理なら新旧比較、非同期処理なら送信側と受信側の状態、再試行なら各試行の結果を残すとよい。
3. `examples/catalog.tsx` の教材の検索対象と単元を追加し、`main.tsx` に週のタイトルを登録する。実際の `LessonData`、目次名、見出し、問い、図解コンポーネントを `Unit` で結ぶ。アニメーションを使う図は `hidden` を受け取り、非表示時に停止する。
4. 見本以外で使うときは `study.css` を1回読み込み、`.study-light` の内部に部品を置く。用語リンクには単元ごとの `HelpProvider` が必要。`StudyShell` は両方のラッパーを用意する。
5. 図・ステップ説明・詳細・JSONは同じ状態から生成する。新たな用語は正本の用語集に追加する。見本でのみ補った `object-viewer` は正本に同じIDがあるとそちらを優先する。

### 最小の比較図

`examples/` 内で作る場合の例。配列を揃える代わりに、各項目から値を取り出す関数で比較軸を定義する。

```tsx
import { Comparison, TermLink, Analogy } from '../ui';

type Destination = { name: string; token: string };
const cases: Destination[] = [
  { name: '非公開の Cloud Run', token: 'ID トークン' },
  { name: 'Cloud Storage API', token: 'アクセストークン' },
];

export function TokenComparison() {
  return <>
    <Comparison<Destination> label="宛先とトークン"
      items={cases.map(d => ({ id: d.name, title: d.name, data: d }))}
      axes={[{ label: '送るもの', value: d =>
        <TermLink id="id-vs-oauth-token">{d.token}</TermLink>
      }]}
    />
    <Analogy>窓口の利用者と書庫の担当者では、提示する証明書が違います。</Analogy>
  </>;
}
```

`GuidedText` は登録済みの語を段落ごとに初出から最大3語までリンクする。コードや強調の中、曖昧な短い語は自動変換しない。図では `TermLink` を明示する。選択肢のようなボタン内では `links={false}` にし、リンクやボタンを入れ子にしない。

## 現行サイトへ取り込む場合

[従来の制作基準](../DESIGN_SYSTEM.md)は3ペイン・例題先行・右ペインのインスペクタ・モバイル固定ドックを指定している。この見本は図解を初期表示にし、W1 P1 は経路を選ぶと横に説明が出る。権限の正式名や JSON は詳細で開く。現行サイトへ自動適用しない。

- デザインだけを採用するときも、既存のシナリオ、図の全状態、ラボ、例題、学習履歴、マスク済み設定画面、24週計画は保持する。見本は各図の代表操作だけを実装している。現行の `App.tsx` を見本で上書きしない。
- 最初は1単元で、元の図解の状態を新しい比較・詳細部品に渡す。既存CSSのグローバル指定が干渉しないよう入口を分ける。`StepInsight.kvPairs` のラベルと値は `Inspector.fields` に、`payloadJson` は `payload.text` に渡せる。
- 元教材の数値や仕様はデザインの検証と分けて確認する。[配分の切り戻し](https://docs.cloud.google.com/run/docs/rollouts-rollbacks-traffic-migration)の秒数、[自動スケール](https://docs.cloud.google.com/run/docs/about-instance-autoscaling)の実台数、[予算](https://docs.cloud.google.com/billing/docs/how-to/budgets)の種類、[イメージの識別](https://docs.cloud.google.com/artifact-registry/docs/docker/names)に注意。単純な計算や配分図を実測値・保証値として扱わない。

## 検証

`app/` で `npm run build && npm run build:study`。見本を起動した状態で、リポジトリのルートから Playwright CLI で確認する。CLIが導入済みの場合の例。

```sh
mkdir -p local/output/playwright
cd local
playwright-cli -s=study-check open http://127.0.0.1:4198/
playwright-cli -s=study-check run-code --filename=../app/study-light/check.js
playwright-cli -s=study-check run-code --filename=../app/study-light/check-library.js
playwright-cli -s=study-check close
```

新しい週は [check.js](check.js) の単元一覧と操作テストに追加する。`### Result` に通過件数が出たことを確認する。終了コードだけでは判定しない。

- 1280×860 と 390×844 で、W1 P1 の全経路が見える。比較に切り替えると3場面、対象、判定、たとえが同時に読める。320px幅でも横にはみ出さない。
- W1 P3 でキー単体、本番プロジェクト、フォルダに切り替えると、読み取り可能なキーが1、2、3個になる。W2 P0 では2つの版・2つのタスクと8つの基礎語が見つかる。
- W1 P1 で条件を変えても5つの登場人物・3場面の配置は維持される。拒否地点で再生が止まり、未到達を選ぶと判定されなかった理由が読める。
- 例題や用語から戻っても選択・再生位置が保持される。キーボードで詳細を閉じて元の操作に戻れる。動きの低減設定で移動する点は消える。
- 画像のラベル、矢印、配分、単位、JSON、長い識別子、タップ対象を実画面で確認する。用語の定義・たとえ・判断の根拠が食い違わないかも読む。
