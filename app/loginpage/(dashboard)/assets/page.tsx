import { uploadAssetAction } from "@/app/admin/actions";
import { listAdminAssetsRequired } from "@/lib/admin-store";

export default async function LoginpageAssetsPage({
  searchParams
}: {
  searchParams: Promise<{ uploaded?: string; error?: string }>;
}) {
  const params = await searchParams;
  let databaseAvailable = true;
  const assets = await listAdminAssetsRequired().catch((error) => {
    databaseAvailable = false;
    console.error("[admin-assets-list]", error instanceof Error ? error.message : "Unknown database error");
    return [];
  });
  const uploadedCount = Number(params.uploaded ?? "0");

  return (
    <section className="stack-grid">
      <section className="panel">
        <p className="eyebrow">Assets</p>
        <h1>이미지 업로드</h1>
        <form action={uploadAssetAction} className="admin-form-grid">
          <label className="field field-wide">
            <span>파일</span>
            <input type="file" name="file" accept="image/*,.pdf,.zip" multiple required />
          </label>
          <label className="field field-wide">
            <span>Cloudinary 폴더</span>
            <input name="folder" placeholder="기본값: aloha-clone" />
          </label>
          <button type="submit" className="action-button" disabled={!databaseAvailable}>
            업로드
          </button>
          {uploadedCount > 0 ? <p className="inline-note">{uploadedCount}개 업로드가 완료되었습니다.</p> : null}
          {params.error === "1" ? <p className="warning-text">업로드할 파일을 선택해 주세요.</p> : null}
          {params.error === "save" ? (
            <p className="warning-text">업로드 또는 DB 기록 저장에 실패했습니다. 같은 파일을 다시 올리기 전에 Cloudinary에서 업로드 여부를 확인해 주세요.</p>
          ) : null}
        </form>
      </section>

      <section className="panel">
        <h2>최근 업로드</h2>
        <div className="admin-list">
          {assets.map((asset) => (
            <article key={asset.id} className="admin-list-card">
              <strong>{asset.originalFilename ?? asset.publicId}</strong>
              <a href={asset.secureUrl} target="_blank" rel="noreferrer">
                {asset.secureUrl}
              </a>
            </article>
          ))}
          {!databaseAvailable ? (
            <p className="warning-text">Supabase DB에 연결하지 못해 최근 업로드 목록을 불러오지 못했습니다.</p>
          ) : assets.length === 0 ? (
            <p className="empty-state">업로드된 자산이 아직 없습니다.</p>
          ) : null}
        </div>
      </section>
    </section>
  );
}
