# 第1週　IAMとCloud Run

## Part 1

**例題｜マニュアルを読めるのは誰？**

社内アプリが非公開のCloud Runサービスを呼び出します。開発者がデプロイし、実行中のサービスは指定バケットのマニュアルを読み取ります。鍵ファイルは置かず、書き込みは禁止です。最適な設定はどれですか？

- A. 呼び出し元にStorage Object Viewerを付け、実行時の権限は変更しない。
- B. 呼び出し元に対象サービスのInvoker、開発者にデプロイ権限と実行時IDの利用権限、専用の実行時IDに対象バケットのObject Viewerを付ける。
- C. 開発者と実行時IDの両方に、プロジェクトのEditorを付ける。
- D. 実行時IDに対象サービスのInvokerだけを付ける。

<details>
<summary>答えと解説を見る</summary>

**B。** 呼び出す、デプロイする、データを読む、の3操作には、それぞれ別の主体と対象があります。AとDではStorageを読む主体に必要な権限がありません。Cは実行時の書き込みまで許す可能性があります。

</details>

**思考のチャート**

1. **入口** → 呼び出し元に、対象Cloud Runサービスの `roles/run.invoker`。
2. **デプロイ** → 開発者にデプロイ権限。さらに、割り当てるサービスアカウント上で `iam.serviceAccounts.actAs`（例 `roles/iam.serviceAccountUser`）。
3. **実行中** → 専用サービスアカウントに、対象バケットの `roles/storage.objectViewer`。

![デプロイ時はサービスIDを割り当てる権限、受信時はCloud Runを呼び出す権限、実行時はバケットを読む権限を確認する。](assets/week01/part1-cloud-run-3-principals.svg)

この3つを分けると、「デプロイできたのに動かない」と「呼び出せたのに処理が失敗する」を別々に説明できます。デプロイでは、開発者が**どの権限を持ったIDでコードを実行できるようにするか**が決まります。仮にCloud Runのデプロイ権限だけで、強い権限を持つ任意のサービスアカウントを割り当てられたら、その権限で動くコードを置けてしまいます。そこでGoogle Cloudは、割り当てようとしているサービスアカウントに対する `actAs` を別に確認します。

次はリクエストです。呼び出し元のIDトークンが対象サービス向けで、呼び出し元がInvokerを持っていれば、Cloud Runはリクエストをアプリに渡せます。その後、アプリがStorageに送るリクエストは、Cloud Runに割り当てた実行時IDの権限で評価されます。**入口で200が返るかとは別に、アプリが受け取ったStorageの応答を確認する**と、失敗箇所を判断できます。

**ミニ例題**　デプロイ時に `iam.serviceAccounts.actAs` が拒否されました。どの対象のIAMを見ますか？

<details>
<summary>答えと解説を見る</summary>

割り当てようとしたサービスアカウントです。デプロイ担当に、そのサービスアカウントを利用する権限があるか確認します。

</details>

**条件が変わったら**　新規オブジェクトの作成も必要なら、作成を許す権限を追加で検討します。上書きや削除も必要かは個別に確認します。

[呼び出し認証](https://docs.cloud.google.com/run/docs/authenticating/overview) ・ [サービスIDの設定](https://docs.cloud.google.com/run/docs/configuring/services/service-identity) ・ [StorageのIAMロール](https://docs.cloud.google.com/storage/docs/access-control/iam-roles)

## Part 2

**例題｜同じアプリをCloud Runと外部CIで認証する**

Cloud Run上のアプリと、外部のCIがGoogle Cloud APIを呼びます。外部CIはOIDCトークンを発行できます。どちらにも長期のサービスアカウントキーを配りたくありません。何を使いますか？

- A. 両方で同じJSONキーを使う。
- B. Cloud Runでは割り当てたサービスIDとADC、外部CIではWorkload Identity Federationを使う。
- C. 両方で開発者個人のブラウザログインを使う。

<details>
<summary>答えと解説を見る</summary>

**B。** Cloud RunではApplication Default Credentials（ADC）がメタデータサーバー経由で、割り当てられたIDの短命な認証情報を取得します。外部CIでは、信頼するOIDCのIDを用いて短命のGoogle Cloud認証情報を取得できます。

</details>

**思考のチャート**

1. **どこで実行する？** Cloud Run、外部CI、ローカルでは使えるIDの取得元が違います。
2. **誰として呼ぶ？** Cloud Runは実行時ID、CIは許可された外部IDまたは借用するサービスアカウントです。
3. **何を許可する？** トークン取得後のAPIアクセスは、対象リソース側のIAMで決まります。

![保存した長期JSON鍵、Cloud Runがメタデータサーバーから取得する短命トークン、外部CIがOIDCを交換して得る短命認証情報を比較する。](assets/week01/part2-short-lived-credentials.svg)

Cloud Runのコンテナにはメタデータサーバーへの経路があります。クライアントライブラリがADCを使い、先に指定された認証情報がなければ、`metadata.google.internal`（リンクローカルアドレス `169.254.169.254`）を通じて、割り当てられたサービスIDのトークンを取得します。トークンには期限があり、ライブラリは必要に応じて取り直します。デプロイ時に秘密鍵をイメージへ入れる必要がないのは、この取得経路が実行環境にあるためです。

Cloud Runの入口に送る**IDトークン**は、相手のサービスが「誰からの呼び出しか」「自分宛てか」を確認するために使います。一方、アプリからStorageなどのGoogle Cloud APIを呼ぶときは、通常 **OAuthアクセストークン**を使います。このときAPIが参照する主体はアプリの実行時IDです。トークンを取得できても、バケット側で該当する操作が許可されている必要があります。

外部CIにはこのCloud Runのメタデータサーバーがありません。Workload Identity Federationでは、Google Cloudが設定した発行元と属性を確認して、外部のOIDCトークンを短命のGoogle Cloud認証情報に交換します。許可対象をリポジトリやブランチなどで絞ると、同じ発行元から来た別のワークロードにも許す、といった設定ミスを防げます。

**ミニ例題**　Macの手動テストは成功し、Cloud Run上ではStorageが拒否されます。最初に何を比べますか？

<details>
<summary>答えと解説を見る</summary>

ローカルとCloud Runがそれぞれ使っているIDです。手元のユーザーが読めても、実行時サービスアカウントに同じデータ権限があるとは限りません。

</details>

**条件が変わったら**　Macで動かすだけなら `gcloud auth application-default login` でユーザーのADCを作れます。本番と同じサービスアカウントの権限を試すなら、借用を許可されたユーザーで `--impersonate-service-account` を使います。

[Cloud RunのサービスID](https://docs.cloud.google.com/run/docs/securing/service-identity) ・ [外部CIのWorkload Identity Federation](https://docs.cloud.google.com/iam/docs/workload-identity-federation-with-deployment-pipelines) ・ [ローカルADC](https://docs.cloud.google.com/docs/authentication/set-up-adc-local-dev-environment)

## Part 3

**例題｜アプリに一つのシークレットだけ読ませる**

Cloud Runの実行時IDに、プロジェクト内にある一つのAPIキーの値だけ読ませたいとします。現在、このIDにSecret Managerの権限はありません。どこで何を付けますか？

- A. プロジェクトにSecret Manager Secret Accessor。
- B. 対象のシークレットにSecret Manager Secret Accessor。
- C. 組織にSecret Manager Admin。

<details>
<summary>答えと解説を見る</summary>

**B。** 対象シークレットに `roles/secretmanager.secretAccessor` を付ければ、その値にアクセスできます。プロジェクトに同じロールを付けると、配下の他のシークレットにも許可が継承されます。

</details>

**思考のチャート**

1. **階層をたどる** → 組織 → フォルダ → プロジェクト → 個々のリソース。
2. **許可を合算する** → そのリソースの許可と、上位から継承した許可を確認します。
3. **必要な範囲で付ける** → 1件だけなら、対象のシークレットに絞ります。

![組織からリソースまで許可が継承される。プロジェクトでStorageを許可すると複数バケットに届き、シークレット単位の付与なら対象を1件に絞れる。](assets/week01/part3-hierarchy-and-secrets.svg)

IAMの**有効なAllowポリシー**は、対象リソースの許可と上位から継承した許可の和集合です。たとえば、プロジェクトでStorage Object Viewerを付与すると、新しく作ったバケットにもその許可が継承されます。個々のバケットに同じロールを記載する必要はありません。逆に機密用バケットのAllowポリシーが空でも、プロジェクトからの許可は有効なままです。

あるバケットだけ読める設計に戻すなら、まず上位の広い付与を外せるか確認し、必要なバケットだけに付与します。上位のAllowを維持しながら特定操作を防ぐ要件では、対象の権限が対応していればIAM Denyも候補です。DenyはAllowの合算とは別に評価されます。Secret Managerでも同じ発想で、アプリに必要なシークレットが1件なら、そのシークレットに付与します。

**ミニ例題**　シークレットのIAMに実行時IDが見当たらないのに、値を読み取れます。どこを見ますか？

<details>
<summary>答えと解説を見る</summary>

プロジェクトやフォルダなど上位の許可と、グループなどを通じた付与を確認します。子リソースでの許可付与を省いても、上位の許可は消えません。

</details>

**条件が変わったら**　専用プロジェクト内の全シークレットを読む要件なら、プロジェクト単位も候補です。将来追加されるシークレットにも継承される点を確認します。

[リソース階層とアクセス制御](https://docs.cloud.google.com/iam/docs/resource-hierarchy-access-control) ・ [IAM Deny](https://docs.cloud.google.com/iam/docs/deny-overview) ・ [Secret Managerのアクセス制御](https://docs.cloud.google.com/secret-manager/docs/access-control)

## Part 4

**例題｜学習用プロジェクトの費用が心配**

月額予算を設定し、到達時に通知を受け取りたいです。チームメンバーは「予算に達すれば利用も止まる」と考えています。何を説明しますか？

- A. 予算の100%でCloud Billingが自動停止する。
- B. 予算は通知用。利用量を抑えたい場合は、対象サービスのクォータや設定を別に調整する。
- C. クォータを1つ設定すれば、プロジェクトの月額請求額に上限を付けられる。

<details>
<summary>答えと解説を見る</summary>

**B。** 予算を作っても利用は継続します。クォータは対象サービスのリソース数などを制限する仕組みで、請求総額を止めるものではありません。

</details>

**思考のチャート**

1. **費用に気づく** → Cloud Billingの予算としきい値通知。
2. **特定の利用量を抑える** → 変更可能なクォータや、サービス固有の上限設定。
3. **通知でアクションを起こす** → Pub/Sub通知を処理する別の仕組み。請求情報と通知には遅延があり得ます。

![サービス利用の後に課金データが反映され、しきい値到達後に通知が届く。利用を制御するにはサービス設定や別の自動化が必要。](assets/week01/part4-budget-alert-boundary.svg)

**リクエストを受け付ける時刻と、その費用が予算に反映される時刻は違います。** たとえばCloud Runで追加の処理が始まった時点では、Cloud Billingがその分の費用をまだ集計していないことがあります。予算は反映された費用や予測額を見て通知するため、各リクエストの前に残額を同期的に判定する仕組みとしては使えません。Pub/Subで通知を受けて処理を止める設計にも、集計、通知、停止処理までの時間差が残ります。

一方、サービスのクォータや同時実行数などの設定は、何をその場で受け付けるかに作用します。費用を監視する仕組みと、使いすぎを抑える仕組みを組み合わせるときは、「どの利用量を抑えると費用が下がるか」まで結び付けて考えます。

**ミニ例題**　本番で予算超過通知を受けたら、課金を自動で無効化してよいですか？

<details>
<summary>答えと解説を見る</summary>

課金無効化はサービス停止を招き得ます。本番で継続稼働が要件なら、まず担当者への通知と、利用量の多い対象を絞った対応を設計します。

</details>

**条件が変わったら**　停止を許容する使い捨ての実習プロジェクトなら、通知を起点とした自動化も候補です。遅延があるため、設定額で確実に支出が止まるとは見なしません。

[予算とアラート](https://docs.cloud.google.com/billing/docs/how-to/budgets) ・ [予算通知に応じた処理](https://docs.cloud.google.com/billing/docs/how-to/notify)

## MacBookでラボを始める前に

架空のマニュアルアプリを想定し、次の3問に一言ずつ予測を書いてから[第1週の演習](../labs/README.md#第1週-iamとcloud-run)へ進みます。

1. 呼び出し元のInvokerを外すと、リクエストはどこで止まる？
2. 開発者が実行時IDを利用できないと、どの操作が失敗する？
3. 実行時IDが対象バケットのObject Viewerだけを持つとき、読み取りと新規書き込みはそれぞれどうなる？

実習後は、予測と実際の違いを[進捗](../PROGRESS.md)に記録します。
