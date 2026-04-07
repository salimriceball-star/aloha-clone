"use client";

import { useEffect, useId, useRef, useState } from "react";

type UploadedAsset = {
  secureUrl: string;
  originalFilename: string | null;
  resourceType: string;
};

type UploadResponse = {
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
  required = false
}: AdminHtmlEditorProps) {
  const inputId = useId();
  const [mode, setMode] = useState<"visual" | "html">("visual");
  const [html, setHtml] = useState(initialHtml ?? "");
  const [status, setStatus] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const htmlTextareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) {
      return;
    }

    if (editor.innerHTML !== html) {
      editor.innerHTML = html;
    }
  }, [html, mode]);

  function syncFromEditor() {
    setHtml(editorRef.current?.innerHTML ?? "");
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
      setHtml((current) => `${current}${markup}`);
      return;
    }

    const start = textarea.selectionStart ?? html.length;
    const end = textarea.selectionEnd ?? html.length;
    const nextValue = `${html.slice(0, start)}${markup}${html.slice(end)}`;
    setHtml(nextValue);

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

    setIsUploading(true);
    setStatus(`${queue.length}개 업로드 중...`);

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
      if (!response.ok || !payload.uploads) {
        throw new Error(payload.error ?? "업로드에 실패했습니다.");
      }

      const markup = payload.uploads.map(buildInsertedMarkup).join("");
      if (mode === "html") {
        insertHtmlIntoTextarea(markup);
      } else {
        insertHtmlAtSelection(markup);
      }

      setStatus(`${payload.uploads.length}개 업로드 후 본문에 삽입했습니다.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "업로드 중 오류가 발생했습니다.");
    } finally {
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

        {mode === "visual" ? (
          <>
            <div className="admin-editor-toolbar">
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
            onChange={(event) => setHtml(event.currentTarget.value)}
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
          {status ?? "이미지 여러 장을 드래그앤드롭하거나 파일 선택으로 현재 위치에 삽입할 수 있습니다."}
        </p>
      </div>

      <textarea name={name} value={html} readOnly hidden required={required} />
    </label>
  );
}
