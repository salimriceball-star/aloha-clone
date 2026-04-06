import { redirect } from "next/navigation";

import { loginAdminAction } from "@/app/admin/actions";
import { isAdminAuthenticated } from "@/lib/admin-auth";

export default async function AdminLoginPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (await isAdminAuthenticated()) {
    redirect("/admin");
  }

  const params = await searchParams;
  const hasError = params.error === "1";

  return (
    <main className="shell">
      <section className="panel admin-login-panel">
        <p className="eyebrow">Admin</p>
        <h1>관리자 로그인</h1>
        <p>관리 기능은 로그인된 관리자만 사용할 수 있습니다.</p>
        <form action={loginAdminAction} className="password-form">
          <label className="field password-field">
            <span>비밀번호</span>
            <input type="password" name="password" autoComplete="current-password" required />
          </label>
          <button type="submit" className="action-button">
            로그인
          </button>
          {hasError ? <p className="warning-text">비밀번호가 올바르지 않습니다.</p> : null}
        </form>
      </section>
    </main>
  );
}
