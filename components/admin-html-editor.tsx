"use client";

import { useEffect, useId, useRef, useState } from "react";

type UploadedAsset = {
  secureUrl: string;
  originalFilename: string | null;
  resourceType: string;
};

type UploadResponse = {
  provider?: "cloudinary";
  uploads?: UploadedAsset[];
  error?: string;
};

type AdminHtmlEditorProps = {
  label: string;
  name: string;
  initialHtml?: string | null;
  description?: string;
  minHeight?: number;
  required?: boolean;
  draftStorageKey?: string;
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function buildInsertedMarkup(asset: UploadedAsset) {
  const url = escapeHtml(asset.secureUrl);
  const label = escapeHtml(asset.originalFilename ?? "첨부 파일");

  if (asset.resourceType === "image") {
    return `<p><img src="${url}" alt="${label}" /></p>`;
  }

  return `<p><a href="${url}" target="_blank" rel="noreferrer">${label}</a></p>`;
}

function getRangeFromPoint(x: number, y: number) {
  if (typeof document.caretRangeFromPoint === "function") {
    return document.caretRangeFromPoint(x, y);
  }

  if (typeof document.caretPositionFromPoint === "function") {
    const position = document.caretPositionFromPoint(x, y);
    if (!position) {
      return null;
    }

    const range = document.createRange();
    range.setStart(position.offsetNode, position.offset);
    range.collapse(true);
    return range;
  }

  return null;
}

export function AdminHtmlEditor({
  label,
  name,
  initialHtml,
  description,
  minHeight = 260,
  required = false,
  draftStorageKey
}: AdminHtmlEditorProps) {
  const inputId = useId();
  const [mode, setMode] = useState<"visual" | "html">("visual");
  const [html, setHtml] = useState(initialHtml ?? "");
  const [status, setStatus] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [savedDraft, setSavedDraft] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const htmlTextareaRef = useRef<HTMLTextAreaElement>(null);
  const hiddenInputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const htmlValueRef = useRef(initialHtml ?? "");
  const isUploadingRef = useRef(false);

  function commitHtml(nextHtml: string) {
    htmlValueRef.current = nextHtml;
    if (hiddenInputRef.current) {
      hiddenInputRef.current.value = nextHtml;
    }
    setHtml(nextHtml);
    setIsDirty(true);
  }

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) {
      return;
    }

    if (editor.innerHTML !== html) {
      editor.innerHTML = html;
    }
  }, [html, mode]);

  useEffect(() => {
    if (!draftStorageKey) return;
    const draft = window.localStorage.getItem(`aloha-editor:${draftStorageKey}`);
    if (draft !== null && draft !== (initialHtml ?? "")) {
      setSavedDraft(draft);
    }
  }, [draftStorageKey, initialHtml]);

  useEffect(() => {
    if (!draftStorageKey || !isDirty) return;
    const timeout = window.setTimeout(() => {
      window.localStorage.setItem(`aloha-editor:${draftStorageKey}`, html);
      setStatus("이 브라우저에 임시 저장했습니다.");
    }, 700);
    return () => window.clearTimeout(timeout);
  }, [draftStorageKey, html, isDirty]);

  useEffect(() => {
    const hiddenInput = hiddenInputRef.current;
    const form = hiddenInput?.form;
    if (!hiddenInput || !form) return;

    const syncSubmittedValue = (event: FormDataEvent) => {
      const latestHtml = mode === "visual" ? editorRef.current?.innerHTML ?? htmlValueRef.current : htmlTextareaRef.current?.value ?? htmlValueRef.current;
      htmlValueRef.current = latestHtml;
      hiddenInput.value = latestHtml;
      event.formData.set(name, latestHtml);
    };
    const blockWhileUploading = (event: SubmitEvent) => {
      if (!isUploadingRef.current) return;
      event.preventDefault();
      setStatus("이미지 업로드가 끝난 뒤 다시 저장해 주세요.");
    };

    form.addEventListener("formdata", syncSubmittedValue);
    form.addEventListener("submit", blockWhileUploading);
    return () => {
      form.removeEventListener("formdata", syncSubmittedValue);
      form.removeEventListener("submit", blockWhileUploading);
    };
  }, [mode, name]);

  const plainText = html.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();

  function syncFromEditor() {
    commitHtml(editorRef.current?.innerHTML ?? "");
  }

  function focusVisualEditor() {
    if (mode !== "visual") {
      return false;
    }

    editorRef.current?.focus();
    return true;
  }

  function execCommand(command: string, value?: string) {
    if (!focusVisualEditor()) {
      return;
    }

    document.execCommand(command, false, value);
    syncFromEditor();
  }

  function insertHtmlAtSelection(markup: string) {
    const editor = editorRef.current;
    if (!editor) {
      return;
    }

    editor.focus();

    const selection = window.getSelection();
    let range =
      selection && selection.rangeCount > 0 && editor.contains(selection.getRangeAt(0).commonAncestorContainer)
        ? selection.getRangeAt(0)
        : null;

    if (!range) {
      range = document.createRange();
      range.selectNodeContents(editor);
      range.collapse(false);
    }

    range.deleteContents();

    const template = document.createElement("template");
    template.innerHTML = markup;
    const fragment = template.content.cloneNode(true) as DocumentFragment;
    const lastNode = fragment.lastChild;
    range.insertNode(fragment);

    if (selection) {
      selection.removeAllRanges();
      if (lastNode) {
        const nextRange = document.createRange();
        nextRange.setStartAfter(lastNode);
        nextRange.collapse(true);
        selection.addRange(nextRange);
      } else {
        selection.addRange(range);
      }
    }

    syncFromEditor();
  }

  function insertHtmlIntoTextarea(markup: string) {
    const textarea = htmlTextareaRef.current;
    if (!textarea) {
      commitHtml(`${htmlValueRef.current}${markup}`);
      return;
    }

    const currentHtml = htmlValueRef.current;
    const start = textarea.selectionStart ?? currentHtml.length;
    const end = textarea.selectionEnd ?? currentHtml.length;
    const nextValue = `${currentHtml.slice(0, start)}${markup}${currentHtml.slice(end)}`;
    commitHtml(nextValue);

    requestAnimationFrame(() => {
      textarea.focus();
      const nextCursor = start + markup.length;
      textarea.setSelectionRange(nextCursor, nextCursor);
    });
  }

  async function uploadFiles(files: FileList | File[]) {
    const queue = Array.from(files).filter((file) => file.size > 0);
    if (queue.length === 0) {
      return;
    }

    isUploadingRef.current = true;
    setIsUploading(true);
    setStatus(`Cloudinary에 ${queue.length}개 업로드 중...`);

    try {
      const formData = new FormData();
      for (const file of queue) {
        formData.append("files", file);
      }

      const response = await fetch("/api/admin/uploads", {
        method: "POST",
        body: formData
      });

      const payload = (await response.json()) as UploadResponse;
      if (!response.ok || payload.provider !== "cloudinary" || !payload.uploads) {
        throw new Error(payload.error ?? "업로드에 실패했습니다.");
      }

      const markup = payload.uploads.map(buildInsertedMarkup).join("");
      if (mode === "html") {
        insertHtmlIntoTextarea(markup);
      } else {
        insertHtmlAtSelection(markup);
      }

      setStatus(
        `Cloudinary 업로드 완료 · ${payload.uploads.length}개를 본문에 삽입했습니다. 상품 저장 버튼을 눌러 변경을 확정해 주세요.`
      );
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "업로드 중 오류가 발생했습니다.");
    } finally {
      isUploadingRef.current = false;
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  function handleLinkInsert() {
    if (mode !== "visual") {
      return;
    }

    const value = window.prompt("링크 주소를 입력하세요.");
    if (!value) {
      return;
    }

    execCommand("createLink", value.trim());
  }

  function restoreDraft() {
    if (savedDraft === null) return;
    commitHtml(savedDraft);
    setSavedDraft(null);
    setStatus("브라우저 임시 저장본을 복원했습니다.");
  }

  function discardDraft() {
    if (draftStorageKey) {
      window.localStorage.removeItem(`aloha-editor:${draftStorageKey}`);
    }
    setSavedDraft(null);
    setStatus("브라우저 임시 저장본을 삭제했습니다.");
  }

  return (
    <label className="field field-wide admin-editor-field" htmlFor={inputId}>
      <span>{label}</span>
      {description ? <small className="editor-description">{description}</small> : null}
      <div className="admin-editor-shell">
        <div className="admin-editor-topbar">
          <div className="admin-editor-mode-tabs">
            <button
              type="button"
              className={`editor-tab ${mode === "visual" ? "is-active" : ""}`}
              onClick={() => setMode("visual")}
            >
              기본 모드
            </button>
            <button
              type="button"
              className={`editor-tab ${mode === "html" ? "is-active" : ""}`}
              onClick={() => setMode("html")}
            >
              HTML 모드
            </button>
          </div>
          <div className="admin-editor-actions">
            <button type="button" className="toolbar-button" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
              이미지 추가
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf,.zip"
              multiple
              hidden
              onChange={(event) => {
                if (event.currentTarget.files) {
                  void uploadFiles(event.currentTarget.files);
                }
              }}
            />
          </div>
        </div>

        {savedDraft !== null ? (
          <div className="editor-recovery-banner">
            <span>이 브라우저에 서버 저장본과 다른 임시 내용이 있습니다.</span>
            <button type="button" className="toolbar-button" onClick={restoreDraft}>복원</button>
            <button type="button" className="toolbar-button" onClick={discardDraft}>삭제</button>
          </div>
        ) : null}

        {mode === "visual" ? (
          <>
            <div className="admin-editor-toolbar">
              <button type="button" className="toolbar-button" onMouseDown={(event) => event.preventDefault()} onClick={() => execCommand("undo")}>
                실행 취소
              </button>
              <button type="button" className="toolbar-button" onMouseDown={(event) => event.preventDefault()} onClick={() => execCommand("redo")}>
                다시 실행
              </button>
              <button type="button" className="toolbar-button" onMouseDown={(event) => event.preventDefault()} onClick={() => execCommand("bold")}>
                굵게
              </button>
              <button type="button" className="toolbar-button" onMouseDown={(event) => event.preventDefault()} onClick={() => execCommand("italic")}>
                기울임
              </button>
              <button type="button" className="toolbar-button" onMouseDown={(event) => event.preventDefault()} onClick={() => execCommand("underline")}>
                밑줄
              </button>
              <button
                type="button"
                className="toolbar-button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => execCommand("formatBlock", "<p>")}
              >
                문단
              </button>
              <button
                type="button"
                className="toolbar-button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => execCommand("formatBlock", "<h2>")}
              >
                H2
              </button>
              <button
                type="button"
                className="toolbar-button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => execCommand("formatBlock", "<h3>")}
              >
                H3
              </button>
              <button type="button" className="toolbar-button" onMouseDown={(event) => event.preventDefault()} onClick={() => execCommand("insertUnorderedList")}>
                목록
              </button>
              <button type="button" className="toolbar-button" onMouseDown={(event) => event.preventDefault()} onClick={() => execCommand("insertOrderedList")}>
                번호
              </button>
              <button type="button" className="toolbar-button" onMouseDown={(event) => event.preventDefault()} onClick={() => execCommand("formatBlock", "<blockquote>")}>
                인용
              </button>
              <button type="button" className="toolbar-button" onMouseDown={(event) => event.preventDefault()} onClick={handleLinkInsert}>
                링크
              </button>
              <button type="button" className="toolbar-button" onMouseDown={(event) => event.preventDefault()} onClick={() => execCommand("unlink")}>
                링크 해제
              </button>
              <button type="button" className="toolbar-button" onMouseDown={(event) => event.preventDefault()} onClick={() => execCommand("insertHorizontalRule")}>
                구분선
              </button>
              <button type="button" className="toolbar-button" onMouseDown={(event) => event.preventDefault()} onClick={() => execCommand("removeFormat")}>
                서식 지우기
              </button>
            </div>
            <div
              ref={editorRef}
              id={inputId}
              className="admin-editor-surface rich-text"
              contentEditable
              suppressContentEditableWarning
              style={{ minHeight }}
              onInput={syncFromEditor}
              onBlur={syncFromEditor}
              onPaste={(event) => {
                const files = Array.from(event.clipboardData.files).filter((file) => file.type.startsWith("image/"));
                if (files.length === 0) {
                  return;
                }

                event.preventDefault();
                void uploadFiles(files);
              }}
              onDragOver={(event) => {
                event.preventDefault();
                event.dataTransfer.dropEffect = "copy";
              }}
              onDrop={(event) => {
                event.preventDefault();
                const range = getRangeFromPoint(event.clientX, event.clientY);
                if (range) {
                  const selection = window.getSelection();
                  selection?.removeAllRanges();
                  selection?.addRange(range);
                }

                void uploadFiles(event.dataTransfer.files);
              }}
            />
          </>
        ) : (
          <textarea
            ref={htmlTextareaRef}
            id={inputId}
            className="editor-html-textarea"
            rows={14}
            value={html}
            onChange={(event) => commitHtml(event.currentTarget.value)}
            onDragOver={(event) => {
              event.preventDefault();
              event.dataTransfer.dropEffect = "copy";
            }}
            onDrop={(event) => {
              event.preventDefault();
              const target = event.currentTarget;
              const start = target.selectionStart ?? html.length;
              target.setSelectionRange(start, start);
              void uploadFiles(event.dataTransfer.files);
            }}
          />
        )}

        <p className="editor-status">
          {status ?? "이미지를 드래그앤드롭하거나 선택하면 Cloudinary에 업로드한 뒤 현재 위치에 삽입합니다."} · 텍스트 {plainText.length.toLocaleString("ko-KR")}자
        </p>
      </div>

      <textarea ref={hiddenInputRef} name={name} defaultValue={initialHtml ?? ""} readOnly hidden required={required} />
    </label>
  );
}
