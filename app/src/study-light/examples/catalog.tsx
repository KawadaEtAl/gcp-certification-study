import type { ComponentType } from 'react';
import type { LessonData } from '../../types';
import { WEEK00_LESSON, WEEK01_LESSONS } from '../../data/week01';
import { WEEK02_LESSONS } from '../../data/week02';
import { Week0Overview } from './Week0Overview';
import { Permissions } from './Permissions';
import { Hierarchy } from './Hierarchy';
import { BillingLag } from './BillingLag';
import { AuthPaths, OverviewMap, ServiceVsJob, Traffic, Capacity, RegistryFlow } from './Patterns';
import type { Unit } from '../ui/Shell';

const ALL_LESSONS: LessonData[] = [WEEK00_LESSON, ...WEEK01_LESSONS, ...WEEK02_LESSONS];

function unit(
  id: LessonData['id'],
  Diagram: ComponentType<{ hidden: boolean }>,
  scope?: string,
): Unit {
  const lesson = ALL_LESSONS.find((l) => l.id === id);
  if (!lesson) throw Error('単元が見つかりません ' + id);
  return {
    lesson,
    name: lesson.shortTitle,
    title: lesson.title,
    question: lesson.tagline,
    Diagram,
    scope,
  };
}

const releaseScope =
  '切り戻し時間や台数は説明用の例です。実際の反映時間・稼働台数・費用を保証するものではありません。';

export const units: Unit[] = [
  unit('w00-overview', () => <Week0Overview />),
  unit('w01-p1', Permissions),
  unit('w01-p2', () => <AuthPaths />),
  unit('w01-p3', () => <Hierarchy />),
  unit(
    'w01-p4',
    () => <BillingLag />,
    'ここで扱うのは通知のみの予算です。支出上限を設定する予算は含みません。利用量の制御にかかる時間や請求総額は保証されません。',
  ),
  unit('w02-p0', () => <OverviewMap />, releaseScope),
  unit('w02-p1', () => <ServiceVsJob />),
  unit('w02-p2', () => <Traffic />, releaseScope),
  unit('w02-p3', () => <Capacity />, releaseScope),
  unit('w02-p4', () => <RegistryFlow />),
];
