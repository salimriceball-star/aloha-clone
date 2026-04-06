import type { ReactNode } from "react";

import { normalizePlainText } from "@/lib/text-format";

type LinkifiedTextProps = {
  className?: string;
  text: string | null | undefined;
};

const urlPattern = /(https?:\/\/[^\s<]+|www\.[^\s<]+)/gi;

function renderLine(line: string, keyPrefix: string) {
  const parts: ReactNode[] = [];
  let lastIndex = 0;

  for (const match of line.matchAll(urlPattern)) {
    const url = match[0];
    const start = match.index ?? 0;

    if (start > lastIndex) {
      parts.push(line.slice(lastIndex, start));
    }

    const href = url.startsWith("http://") || url.startsWith("https://") ? url : `https://${url}`;
    parts.push(
      <a key={`${keyPrefix}-${start}`} href={href} target="_blank" rel="noreferrer">
        {url}
      </a>
    );
    lastIndex = start + url.length;
  }

  if (lastIndex < line.length) {
    parts.push(line.slice(lastIndex));
  }

  return parts;
}

export function LinkifiedText({ className, text }: LinkifiedTextProps) {
  const normalized = normalizePlainText(text);
  const lines = normalized.split("\n");

  return (
    <p className={className}>
      {lines.map((line, index) => (
        <span key={`${line}-${index}`}>
          {renderLine(line, `${index}`)}
          {index < lines.length - 1 ? <br /> : null}
        </span>
      ))}
    </p>
  );
}
