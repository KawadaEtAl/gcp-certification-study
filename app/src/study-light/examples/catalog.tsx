import type { ComponentType } from 'react';
import type { LessonData } from '../../types';
import { WEEK01_LESSONS } from '../../data/week01';
import { WEEK02_LESSONS } from '../../data/week02';
import { Permissions } from './Permissions';
import { Hierarchy } from './Hierarchy';
import { PairedLesson, OverviewMap, Traffic, Capacity } from './Patterns';
import type { Unit } from '../ui/Shell';

function unit(
  id: LessonData['id'],
  name: string,
  title: string,
  question: string,
  Diagram?: ComponentType<{ hidden: boolean }>,
  scope?: string,
): Unit {
  const lesson = [...WEEK01_LESSONS, ...WEEK02_LESSONS].find((l) => l.id === id);
  if (!lesson) throw Error('単元が見つかりません ' + id);
  return { lesson, name, title, question, Diagram: Diagram ?? (() => <PairedLesson id={id} />), scope };
}
const releaseScope =
  '切り戻し時間や台数は説明用の例です。実際の反映時間・稼働台数・費用を保証するものではありません。';
export const units = [
  unit(
    'w01-p1',
    '3つの権限チェック',
    'Cloud Run の3つの権限チェック',
    '社内ポータルからマニュアルを読むには、誰にどの権限が必要でしょうか。',
    Permissions,
  ),
  unit(
    'w01-p2',
    '鍵を使わない認証',
    '秘密鍵を置かずに認証する',
    '秘密鍵を配らずに、何を根拠に誰のトークンを取得できるのでしょうか。',
  ),
  unit(
    'w01-p3',
    'IAM の継承',
    'IAM の許可はどこまで届く？',
    '本番のマニュアル用キー（rag-api-key）だけをアプリに読ませるには、どこで許可しますか。',
    Hierarchy,
  ),
  unit(
    'w01-p4',
    '予算通知とクォータ',
    '予算通知とクォータの違い',
    '費用を知る仕組みと、利用量を抑える仕組みはどう違うでしょうか。',
    undefined,
    'ここで扱うのは通知のみの予算です。支出上限を設定する予算は含みません。利用量の制御にかかる時間や請求総額は保証されません。',
  ),
  unit(
    'w02-p0',
    '今週の全体図',
    'アプリを更新して、動かすまで',
    'マニュアルを返す処理と、夜間に索引を更新する処理をどう組み合わせますか。',
    OverviewMap,
    releaseScope,
  ),
  unit(
    'w02-p1',
    'サービスとジョブ',
    'サービスとジョブを使い分ける',
    '問い合わせへの応答と夜間の索引更新で、処理の終わり方はどう違いますか。',
  ),
  unit(
    'w02-p2',
    'リリースと切り戻し',
    '新しい版に少しずつ切り替える',
    '新しいリビジョンを試すために、どのくらいのリクエストを振り分けますか。',
    Traffic,
    releaseScope,
  ),
  unit(
    'w02-p3',
    '同時実行数と台数',
    '何台あれば同時に処理できる？',
    '1台あたりの同時実行数を変えると、必要な台数はどう変わりますか。',
    Capacity,
    releaseScope,
  ),
  unit(
    'w02-p4',
    'イメージの管理',
    '同じイメージをもう一度使う',
    'Artifact Registry でタグが付け替わっても、同じ中身を指定するには？',
  ),
];
