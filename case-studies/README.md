# PCA公式ケーススタディ

[標準試験ガイド](https://services.google.com/fh/files/misc/professional_cloud_architect_exam_guide_english.pdf) で案内される4件。1ケースにつき1枚にまとめ、同じ制約で複数の案を比較する。

| 週 | 公式PDF | 着目点 |
| --- | --- | --- |
| 17 | [Altostrat Media](https://services.google.com/fh/files/misc/v6.1_pca_altostrat_media_case_study_english.pdf) | メディア管理、発見・推薦、既存基盤へのAI導入 |
| 18 | [Cymbal Retail](https://services.google.com/fh/files/misc/v6.1_pca_cymbal_retail_case_study_english.pdf) | カタログ整備、会話型の商品発見、周辺連携と運用 |
| 19 | [EHR Healthcare](https://services.google.com/fh/files/misc/v6.1_pca_ehr_healthcare_case_study_english.pdf) | 移行、既存の保険会社連携、可用性・復旧・規制 |
| 20 | [KnightMotives Automotive](https://services.google.com/fh/files/misc/v6.1_pca_knightmotives_automotive_case_study_english.pdf) | 車両データ、オンライン注文の信頼性、段階導入 |

## 分析テンプレート

1. 事業目標と成否を測る指標。
2. 既存構成、移行が難しい依存先、前提として残すもの。
3. 要件と制約。根拠が本文にあるものと自分が置いた仮定を区別。
4. 案Aと案B。可用性、セキュリティ、コスト、運用負荷を比較。
5. 採用する案、棄却する案、その判断が逆転する条件。
6. デプロイ後の確認、失敗時に戻す境界、残る疑問。
