# Study Light 学習サイト設計ガイド

**比較するものを同時に見せ、仕組みを順に追う操作は学習者が選べるようにする。** 1画面の中心は1つの問い。余白は図を大きくするために、色は関係や変化を示すために使う。

このブランチは、Gemini 4 Neon が今後の教材制作で参照できるデザイン案。Week 1 の4単元と Week 2 の全体図＋4単元が動く。`app/src/data/` の教材を参照し、現行サイト・成績・ラボ環境から独立している。

## 最初に見るもの

1. [PCの比較画面](reference/w01-p1-1280.png)、[スマホの比較画面](reference/w01-p1-390.png)、[途中で拒否された例](reference/denied.png)を見比べる。
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

[比較・再生](http://127.0.0.1:4198/#w01-p1/0) ／ [Week 2の全体図](http://127.0.0.1:4198/#w02-p0/0) ／ [配分の変更](http://127.0.0.1:4198/#w02-p2/0)

ポートが使用中なら `npm run study -- --port 4199` を使い、リンクのポートも変更する。共有するのはURLの `#w02-p2/0` の部分。末尾の番号は図解・例題・解説・ラボの順に0〜3。初版の `#part1/2` なども開ける。

通常の `npm run build` は従来のアプリを `dist/` に、`npm run build:study` は見本を `dist-study-light/` に出力する。公開サイトの入口、配信ワークフロー、元の教材は変更していない。見本は別の保存キー `gcp.study.light.v2.*` を使う。学習済み・ブックマーク・ラボのメモはブラウザ内に保存し、例題の選択・図の状態は同じ単元のタブを行き来する間だけ保持する。

## 学習者が一度に見られるもの

| 目的 | 基本設計 | 避けること |
|---|---|---|
| 違いを見抜く | 同じ比較軸を同じ順に揃える。比較中は選んでいない対象も残す | 順番に開かないと差が分からないタブ、スマホの横スクロール |
| 因果を追う | 成功・拒否・未到達を区別する。任意で1場面ずつ再生し、下に比較図を残す | 未到達を失敗と表示する、自動再生で読む速さを決める |
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
| 全体図・階層、条件変更 | `Art`・`BranchDiagram`・`ChoiceGroup` | W2 P0、W1 P3。分岐は1親2子。複雑な構造は専用の図で表す |
| 配分と計算 | `RangeControl`・`RatioBar`・`Insight` | W2 P2・P3。両方の割合と条件を同時に表示 |
| 用語とたとえ | `HelpProvider`・`TermLink`・`GuidedText`・`LessonTerms`・`Analogy` | 全タブ。用語集の `summary / analogy / examPoint / relatedIds` を使用 |
| 詳細・コード・設定画面 | `Modal`・`Inspector`・`CodeBlock`・`Disclosure` | W1 P1の場面名を押す。既存の `ConsoleScreenGallery` は画像がある場合のみ解説に表示 |
| ストーリー、判断の順序、例題、演習 | `Story`・`Explanation`・`Quiz`・`Lab` | `LessonData` から描画。ラボがない週は予測・作図・ミニ確認を使う |

`ArtName` は `laptop / portal / server / identity / bucket / image / job`。図は省略できる。例えばタグとダイジェストは表記の違いが主題なので、図を2つ並べず文字を揃える。

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

[従来の制作基準](../DESIGN_SYSTEM.md)は3ペイン・例題先行・右ペインのインスペクタ・モバイル固定ドックを指定している。この見本は比較を初期表示にし、インスペクタを詳細に移している。現行サイトへ自動適用しない。

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
playwright-cli -s=study-check close
```

新しい週は [check.js](check.js) の単元一覧と操作テストに追加する。`### Result` に通過件数が出たことを確認する。終了コードだけでは判定しない。

- 1280×860 と 390×844 で、W1 P1 の3場面、対象、判定、たとえが同時に読める。320px幅でも横にはみ出さない。
- 条件を変えても各場面は残る。拒否地点で再生が止まり、未到達を選ぶと判定されなかった理由が読める。
- 例題や用語から戻っても選択・再生位置が保持される。キーボードで詳細を閉じて元の操作に戻れる。動きの低減設定で移動する点は消える。
- 画像のラベル、矢印、配分、単位、JSON、長い識別子、タップ対象を実画面で確認する。用語の定義・たとえ・判断の根拠が食い違わないかも読む。
