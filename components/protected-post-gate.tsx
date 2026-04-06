"use client";

import Image from "next/image";
import { useEffect, useState, type FormEvent } from "react";

import { RichHtml } from "@/components/rich-html";
import { htmlHasLeadingImage } from "@/lib/html-utils";
import type { PostEntry } from "@/lib/site-data";

type ProtectedPostGateProps = {
  post: PostEntry;
};

function storageKey(postId: number) {
  return `aloha-clone/protected-post/${postId}`;
}

export function ProtectedPostGate({ post }: ProtectedPostGateProps) {
  const [password, setPassword] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [error, setError] = useState("");
  const coverImageUrl =
    post.coverImageUrl && !htmlHasLeadingImage(post.contentHtml, post.coverImageUrl) ? post.coverImageUrl : null;

  useEffect(() => {
    try {
      setUnlocked(window.localStorage.getItem(storageKey(post.id)) === "open");
    } catch {
      setUnlocked(false);
    }
  }, [post.id]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (password === (post.accessPassword ?? "")) {
      try {
        window.localStorage.setItem(storageKey(post.id), "open");
      } catch {}
      setUnlocked(true);
      setError("");
      return;
    }

    setError("비밀번호가 올바르지 않습니다.");
  };

  return (
    <article className="article-shell article-shell-polished">
      <header className="article-header">
        <p className="meta-line">{post.categoryNames.join(" · ") || "글"}</p>
        <h1>{unlocked ? post.title : `보호된 글: ${post.title}`}</h1>
        <div className="article-meta">
          <span>{new Date(post.date).toLocaleDateString("ko-KR")}</span>
        </div>
      </header>

      {unlocked ? (
        <>
          {coverImageUrl ? (
            <div className="article-cover">
              <Image src={coverImageUrl} alt={post.title} width={1200} height={720} />
            </div>
          ) : null}
          <RichHtml className="rich-text article-body" html={post.contentHtml} />
        </>
      ) : (
        <div className="panel password-panel">
          <form className="password-form" onSubmit={handleSubmit}>
            <p className="password-note">
              이 콘텐츠는 비밀번호로 보호되어 있습니다. 이 콘텐츠를 보려면 아래에
              비밀번호를 입력해주세요:
            </p>
            <div className="password-row">
              <label className="field password-field">
                <span>비밀번호</span>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  spellCheck={false}
                />
              </label>
              <button type="submit" className="action-button">
                확인
              </button>
            </div>
            {error ? <p className="warning-text">{error}</p> : null}
          </form>
        </div>
      )}
    </article>
  );
}
