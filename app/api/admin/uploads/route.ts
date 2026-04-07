import { NextResponse } from "next/server";

import { isAdminAuthenticated } from "@/lib/admin-auth";
import { isUploadableFile, uploadAdminFiles } from "@/lib/admin-uploads";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const files = formData
    .getAll("files")
    .filter((value): value is File => isUploadableFile(value) && value.size > 0);

  if (files.length === 0) {
    return NextResponse.json({ error: "no-files" }, { status: 400 });
  }

  try {
    const uploads = await uploadAdminFiles(files, String(formData.get("folder") ?? ""));
    return NextResponse.json({ uploads });
  } catch (error) {
    const message = error instanceof Error ? error.message : "upload-failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
