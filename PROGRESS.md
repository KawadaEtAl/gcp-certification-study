# 学習進捗

## Last Session

- 日付：2026-11-28
- 実績：
  - 第1週（IAMとCloud Run）の読解・作図・ハンズオン観測・口頭説明を完了した。
  - 第1週の振り返り（PC・スマホ学習でのつまずき・理解特性）をもとに、第2週以降の教材設計基準を [app/DESIGN_SYSTEM.md](app/DESIGN_SYSTEM.md) と [labs/README.md](labs/README.md) へ確定・反映した（Web アプリ正本・週次ノート廃止・Part 0 全体マップ導入・静的骨格図ベース＋インタラクティブ厳選・基礎説明＋柔軟性プロビソ・重要画面のみスクショ・4 ステップ定着ループ標準化・Anki は第2〜3週完了後に再評価）。
- 学習・演習の実測：
  - **事前予測（3問）**：Invoker外しは入口で止まりGCS readなし／実行時ID利用不可はデプロイ失敗／Object Viewerのみは読み取りOK・書き込みNG → 3問とも実測と一致。
  - **作図で修正した点**：呼び出し元IDと実行時SAが混同していた点・`actAs`がデプロイ時（設定時）の権限である点・権限拒否が400ではなく403である点を整理。
  - **個人サンドボックスでの実測**：
    - バケットに Uniform bucket-level access が有効で、ファイル単体ACLではなくバケット単位のIAMで専用SAに `roles/storage.objectViewer` のみ付与（継承なし・プロジェクト権限なし）。
    - 非公開 Cloud Run（`--no-allow-unauthenticated`）へ専用SAを割り当ててデプロイ。
    - 認証なし `GET /read` → 入口（Google Frontend / IAM層）で `403 Forbidden`（`text/html`、`x-cloud-trace-context` なし＝アプリ未到達）。
    - IDトークン付き `GET /read` → `200 OK`（`application/json`、JSON鍵なしでADC経由で読み取り成功）。
    - IDトークン付き `POST /write` → `403 Forbidden`（`application/json`、呼び出し元はオーナーでも実行時SAに `storage.objects.create` が無いため拒否）。
  - **メモなし説明**：ADC＋メタデータサーバーによる短命トークン取得（JSON鍵不要）、予算アラートはラグがあり停止機能ではないためクォータやインスタンス上限等のガードレールが必要であることを自分の言葉で説明した。
  - **後片付け状況**：個人サンドボックスの検証リソース（極小コスト）は継続演習用に残置。別環境で作ったテストバケットは削除済み。
- 詰まった点：
  - `gcloud run deploy --source .` 実行時、開発者（オーナー）ではなく裏側の **Cloud Build ビルド用デフォルトSA** に権限が不足してビルド失敗 → `roles/run.builder` と `roles/serviceusage.serviceUsageConsumer` を付与して解決（開発者・ビルド用SA・実行時SAの3つが別々に評価されることを実測）。
  - 実行時SAは「実行時」専用であり、デプロイ主体／ビルド主体とは別であることを再確認。

## Current State

- 対象：PCA。受験日は未定。
- 現在地：第1週完了 → 次は第2週（Cloud Runのサービス／ジョブ、リビジョン、スケール、Artifact Registry）。
- 週あたりの学習時間：4〜6時間を仮置き。
- 既知の重点：実行とデプロイの権限区分、ネットワーク、障害時の判断。
- [完了条件](CHECKLIST.md)

## Next Session Should

1. **第2週着手前の土台補強（Week 0）**：`app/` の Week 0（および必要に応じて [notes/glossary.md](notes/glossary.md) 先頭）に、**「GCP 全体地図（骨格図 2 枚：リソースの木構造 vs 木の外のプリンシパル＋物理配置の別軸／フォルダ＆組織ポリシー実例）＋ IAM の 3 原則」** を追記して土台を固定する。
2. **第2週教材の作成（新設計基準）**：[ロードマップ](ROADMAP.md)の第2週（Cloud Run のサービス／ジョブ、リビジョン、スケール、Artifact Registry）と [local/knowledge-agent-reading-map.md](local/knowledge-agent-reading-map.md) の第2週箇所を踏まえ、[app/DESIGN_SYSTEM.md](app/DESIGN_SYSTEM.md) の新基準で Web アプリ（Part 0＋Part 1〜4＋重要画面スクショ）と Anki カードを作成する。
3. **第2週ハンズオン（4 ステップ定着ループ）**：個人サンドボックスの既存 `week01-manual-api` を発展させ、事前予測 → 手書き作図添削 → 2 リビジョン分割・トラフィック切替・旧版切り戻し実測 → メモなし音声説明を実施する。
4. **（マイルストーン）第2〜3週完了時**：Anki（`anki/`）の継続・運用方法を再検討する。

## Context the Next Session Needs

- [ロードマップ](ROADMAP.md)の第1週。
- 公式教材リンクは[トップページ](README.md)。
- 用語を知っていること、説明できること、実際に観測したことを区別する。
- 次回以降は日付、学習時間、やったこと、観測結果、疑問、次回の一手を追記する。
