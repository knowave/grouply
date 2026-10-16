import type { ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type Props = { message: string; data: Record<string, string> };

const LABEL_RE = /(일시:|장소:)/;
const linkClass = "underline text-blue-600";

function PlainLines({ text, locationUrl }: { text: string; locationUrl: string }) {
  const safeUrl = /^https?:\/\//.test(locationUrl) ? locationUrl : "";
  return (
    <>
      {text.split("\n").map((line, i) => {
        if (!line.trim()) return <div key={i} className="h-3" />;
        let content: ReactNode = line;
        if (line.startsWith("📝")) {
          content = <strong>{line}</strong>;
        } else {
          const m = LABEL_RE.exec(line);
          if (m) {
            const head = line.slice(0, m.index);
            const rest = line.slice(m.index + m[1].length);
            const value = m[1] === "장소:" && safeUrl ? (
              <a href={safeUrl} target="_blank" rel="noreferrer" className={linkClass}>
                {rest.trim()}
              </a>
            ) : (
              rest.trim()
            );
            content = (
              <>
                {head}
                <strong>{m[1]}</strong> {value}
              </>
            );
          }
        }
        return <div key={i}>{content}</div>;
      })}
    </>
  );
}

export function NoticePreview({ message, data }: Props) {
  // 서버가 message의 연속 빈 줄(\n{3,})을 \n\n으로 합치므로 같은 규칙으로 맞춰야 찾을 수 있다
  const desc = (data.description ?? "").trim().replace(/\n{3,}/g, "\n\n");
  // 제목 등 앞부분과 겹치지 않게 📝 소제목(없으면 GENERAL의 인사말) 뒤부터 찾는다
  const anchor = message.indexOf("\n📝");
  const from = anchor >= 0 ? anchor + 1 : Math.max(message.indexOf("안녕하세요!"), 0);
  const at = desc ? message.indexOf(desc, from) : -1;
  const locationUrl = (data.locationUrl ?? "").trim();
  const before = at >= 0 ? message.slice(0, at) : message;
  const after = at >= 0 ? message.slice(at + desc.length) : "";

  // 첫 줄은 항상 굵게
  const nl = before.indexOf("\n");
  const first = nl >= 0 ? before.slice(0, nl) : before;
  const restBefore = nl >= 0 ? before.slice(nl) : "";

  return (
    <div className="rounded-md border border-black/10 bg-white p-4 text-sm leading-relaxed">
      <div className="font-bold">{first}</div>
      <PlainLines text={restBefore.replace(/^\n/, "")} locationUrl={locationUrl} />
      {at >= 0 && (
        <div className="space-y-2 [&_blockquote]:border-l-4 [&_blockquote]:border-black/20 [&_blockquote]:pl-3 [&_code]:rounded [&_code]:bg-black/5 [&_code]:px-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              a: ({ href, children }) => (
                <a href={href} target="_blank" rel="noreferrer" className={linkClass}>
                  {children}
                </a>
              ),
            }}
          >
            {desc}
          </ReactMarkdown>
        </div>
      )}
      {at >= 0 && <PlainLines text={after.replace(/^\n/, "")} locationUrl={locationUrl} />}
    </div>
  );
}
