import { Fragment } from 'react';

/**
 * Renders inline `code` spans (backtick-delimited) with subtle Material code pill
 * styling, and inserts <wbr /> after `/` and `.` inside code tokens so long
 * IAM roles/permissions wrap cleanly without breaking mid-word.
 */
export function RichText({ text }: { text: string }) {
  const parts = text.split(/(`[^`]+`)/g);
  return (
    <>
      {parts.map((part, idx) => {
        if (part.startsWith('`') && part.endsWith('`')) {
          const code = part.slice(1, -1);
          return (
            <code key={idx} className="inline-code">
              <BreakableIdentifier text={code} />
            </code>
          );
        }
        return <Fragment key={idx}>{part}</Fragment>;
      })}
    </>
  );
}

/**
 * Inserts <wbr /> after `/` and `.` so long GCP identifiers like
 * `roles/secretmanager.secretAccessor` wrap cleanly at delimiters.
 */
export function BreakableIdentifier({ text }: { text: string }) {
  const segments = text.split(/([/.])/g);
  return (
    <>
      {segments.map((seg, idx) => (
        <Fragment key={idx}>
          {seg}
          {(seg === '/' || seg === '.') && <wbr />}
        </Fragment>
      ))}
    </>
  );
}
