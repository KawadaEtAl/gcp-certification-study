import { useState } from 'react';
import {
  IdCard,
  Layers,
  Building2,
  Folder,
  KeyRound,
  Cloud,
  Archive,
  Pin,
  CornerDownRight,
  Minus,
  type LucideIcon,
} from 'lucide-react';
import { ChoiceGroup, Insight } from '../ui/Diagrams';
import { TermLink, Analogy } from '../ui/Help';
import { ResourceTree, type TreeItem } from '../ui/Relations';

const kind = {
  org: ['組織', 'resource-hierarchy', Building2],
  folder: ['フォルダ', 'resource-hierarchy', Folder],
  project: ['プロジェクト', 'resource-hierarchy', Layers],
  secret: ['シークレット', 'secret-manager', KeyRound],
  bucket: ['バケット', 'cloud-storage', Archive],
  run: ['Cloud Run', 'cloud-run', Cloud],
  sa: ['サービスアカウント', 'service-account', IdCard],
} satisfies Record<string, [string, string, LucideIcon]>;

function node(name: string, type: keyof typeof kind, children?: TreeItem[]): TreeItem {
  const [label, term, Icon] = kind[type];
  return {
    id: name,
    kind: type,
    icon: <Icon size={18} />,
    children,
    label: (
      <>
        <TermLink id={term}>{label}</TermLink>
        <b>{name}</b>
      </>
    ),
  };
}
const scopeIds = ['rag-api-key', 'manual-prod', '広告事業部'];
const resources = [
  node('サンプル社', 'org', [
    node('広告事業部', 'folder', [
      node('manual-prod', 'project', [
        node('manual-rag', 'run'),
        node('sa-reader', 'sa'),
        node('manual-docs', 'bucket'),
        node('rag-api-key', 'secret'),
        node('db-master-pass', 'secret'),
      ]),
      node('manual-dev', 'project', [node('test-key', 'secret')]),
    ]),
  ]),
];
const purpose: Record<string, string> = {
  'manual-rag': 'アプリを実行',
  'sa-reader': '実行 ID',
  'manual-docs': '資料を保管',
  サンプル社: '階層の起点',
  広告事業部: '部門',
  'manual-prod': '本番',
  'manual-dev': '開発',
};

export function Hierarchy() {
  const [scope, set] = useState(1),
    target = scopeIds[scope];
  const summary = ['マニュアル用のキーだけ読める', '本番のキーを両方読める', '本番と開発の全キーを読める'][
    scope
  ];
  return (
    <>
      <section className="figure policy-example" aria-label="シークレットの値の読み取り">
        <div className="policy-toolbar">
          <div>
            <div>
              <TermLink id="principal">権限を使う ID</TermLink>
              <b>sa-reader</b>
            </div>
            <div>
              <TermLink id="role-permission">ロール</TermLink>
              <b>Secret Accessor</b>
            </div>
          </div>
          <div>
            <b>付与先</b>
            <ChoiceGroup
              label="許可を付ける範囲"
              choices={['キー単体', 'プロジェクト', 'フォルダ']}
              value={scope}
              onChange={set}
            />
          </div>
        </div>
        <div className="tree-caption">
          <span>線はリソースの親子関係</span>
          <span aria-live="polite">{target} に付与</span>
        </div>
        <ResourceTree
          label="組織から個々のリソースまで"
          items={resources}
          annotation={({ id, kind }, parents) => {
            const isSecret = kind === 'secret';
            if (id === target)
              return (
                <b data-access="direct">
                  <Pin size={15} />
                  直接付与{isSecret && '・読める'}
                </b>
              );
            if (parents.includes(target) && (isSecret || kind === 'project'))
              return (
                <b data-access="inherited">
                  <CornerDownRight size={15} />
                  継承{isSecret && '・読める'}
                </b>
              );
            if (isSecret)
              return (
                <span data-access="none">
                  <Minus size={15} />
                  読めない
                </span>
              );
            return purpose[id];
          }}
        />
        <p className="tree-foot">
          上欄の <TermLink id="service-account">sa-reader</TermLink> は権限を使う ID
          で、図の中では本番プロジェクトに属するリソースです。人のアカウントやグループはこの階層の外にいます。
        </p>
      </section>
      <Insight title={summary}>
        <TermLink id="secret-manager">Secret Manager</TermLink> で rag-api-key
        の値だけが必要なら、このシークレットに直接付与します。上位で付与すると、配下の他のシークレットにも許可が
        <TermLink id="allow-inheritance">継承</TermLink>されます。
      </Insight>
      <Analogy>
        本番と開発を別々の資料室、シークレットを鍵付きの棚と考えます。棚の鍵を渡すか、部屋の全ての棚を開ける鍵を渡すかで、同じ担当者が見られる資料の範囲が変わります。
      </Analogy>
      <p className="sub">
        フォルダを使う組織の例です。判定はシークレットの値の読み取りに限ります。条件・他の許可・拒否ポリシーはありません。Cloud
        Run の呼び出しやバケットの読み取りには別の権限が必要です。
      </p>
    </>
  );
}
