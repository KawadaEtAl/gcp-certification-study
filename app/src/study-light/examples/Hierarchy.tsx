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
  ShieldBan,
  type LucideIcon,
} from 'lucide-react';
import { ChoiceGroup, Insight } from '../ui/Diagrams';
import { TermLink, Analogy } from '../ui/Help';
import { CodeBlock, Disclosure } from '../ui/Lesson';
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
  const [scope, set] = useState(1);
  const [denyDbPass, setDenyDbPass] = useState(false);
  const target = scopeIds[scope];
  const summary =
    denyDbPass && scope >= 1
      ? '上位 Allow が継承されても、IAM Deny が db-master-pass を優先遮断'
      : ['マニュアル用のキーだけ読める（最小スコープ）', '本番のキーを両方読める（継承の罠）', '本番と開発の全キーを読める（過剰権限）'][scope];

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
            <button
              type="button"
              className="deny-toggle"
              aria-pressed={denyDbPass}
              onClick={() => setDenyDbPass((prev) => !prev)}
            >
              <ShieldBan size={15} />
              IAM Deny（db-master-pass）
            </button>
          </div>
        </div>
        <div className="tree-caption">
          <span>線はリソースの親子関係</span>
          <span aria-live="polite">
            {target} に付与{denyDbPass ? ' ＋ Deny 有効' : ''}
          </span>
        </div>
        <ResourceTree
          label="組織から個々のリソースまで"
          items={resources}
          annotation={({ id, kind }, parents) => {
            const isSecret = kind === 'secret';
            if (denyDbPass && id === 'db-master-pass')
              return (
                <b data-access="denied">
                  <ShieldBan size={15} />
                  Deny で遮断
                </b>
              );
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
        <TermLink id="secret-manager">Secret Manager</TermLink> で <code>rag-api-key</code>
        の値だけが必要なら、このシークレットに直接付与するのが第一選択です。上位で付与すると配下の他シークレットにも許可が
        <TermLink id="allow-inheritance">足し算で継承</TermLink>され、子リソース側を空にしても打ち消せません。例外的に上位 Allow を残しつつ特定操作を止めたいときだけ{' '}
        <TermLink id="iam-deny">IAM Deny</TermLink> を使います。
      </Insight>
      <Disclosure title="有効なポリシー評価結果を JSON で見る">
        <CodeBlock
          text={JSON.stringify(
            {
              principal: 'serviceAccount:sa-reader@manual-prod.iam.gserviceaccount.com',
              allowAttachedAt: target,
              role: 'roles/secretmanager.secretAccessor',
              denyGuardrailOnDbMasterPass: denyDbPass,
              effectiveAccess: {
                'rag-api-key': 'ALLOW',
                'db-master-pass': denyDbPass ? 'DENY (overrides inherited Allow)' : scope >= 1 ? 'ALLOW (inherited)' : 'NONE',
                'test-key': scope >= 2 ? 'ALLOW (inherited)' : 'NONE',
              },
            },
            null,
            2,
          )}
        />
      </Disclosure>
      <Analogy>
        本番と開発を別々の資料室、シークレットを鍵付きの棚と考えます。棚の鍵 1 本を渡すか、部屋の全棚を開ける鍵を渡すかで、同じ担当者が見られる範囲が変わります。IAM Deny は全棚パスを持っていても特定の金庫だけ開けさせない非常ロックです。
      </Analogy>
      <p className="sub">
        フォルダを使う組織の例です。判定はシークレットの値の読み取りに限ります。Cloud Run の呼び出しやバケットの読み取りには別の権限が必要です。
      </p>
    </>
  );
}
