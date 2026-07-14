"use client";

import Image from "next/image";
import { useState, type FormEvent } from "react";

import { RichHtml } from "@/components/rich-html";

type ProtectedPostSummary = {
  id: number;
  path: string;
  title: string;
  date: string;
  categoryNames: string[];
};

type UnlockedContent = {
  title: string;
  contentHtml: string;
  coverImageUrl: string | null;
};

export function ProtectedPostGate({ post }: { post: ProtectedPostSummary }) {
  const [password, setPassword] = useState("");
  const [unlocked, setUnlocked] = useState<UnlockedContent | null>(null);
  const [error, setError] = useState("");
  const [isChecking, setIsChecking] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsChecking(true);
    setError("");
    try {
      const response = await fetch("/api/posts/unlock", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ path: post.path, password })
      });
      const payload = (await response.json()) as UnlockedContent & { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "비밀번호가 올바르지 않습니다.");
      }
      setUnlocked(payload);
      setPassword("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "잠금 해제에 실패했습니다.");
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <article className="article-shell article-shell-polished">
      <header className="article-header">
        <p className="meta-line">{post.categoryNames.join(" · ") || "글"}</p>
        <h1>{unlocked?.title ?? `보호된 글: ${post.title}`}</h1>
        <div className="article-meta">
          <span>{new Date(post.date).toLocaleDateString("ko-KR")}</span>
        </div>
      </header>

      {unlocked ? (
        <>
          {unlocked.coverImageUrl ? (
            <div className="article-cover">
              <Image src={unlocked.coverImageUrl} alt={unlocked.title} width={1200} height={720} />
            </div>
          ) : null}
          <RichHtml className="rich-text article-body" html={unlocked.contentHtml} />
        </>
      ) : (
        <div className="panel password-panel">
          <form className="password-form" onSubmit={handleSubmit}>
            <p className="password-note">이 콘텐츠는 비밀번호로 보호되어 있습니다. 비밀번호를 입력해 주세요.</p>
            <div className="password-row">
              <label className="field password-field">
                <span>비밀번호</span>
                <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} spellCheck={false} required />
              </label>
              <button type="submit" className="action-button" disabled={isChecking}>
                {isChecking ? "확인 중…" : "확인"}
              </button>
            </div>
            {error ? <p className="warning-text">{error}</p> : null}
          </form>
        </div>
      )}
    </article>
  );
}
