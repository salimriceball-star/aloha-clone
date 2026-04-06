function normalizeComparablePathname(value: string) {
  return value.replace(/-\d+x\d+(?=\.[a-z0-9]+$)/i, "");
}

function normalizeComparableUrl(value: string) {
  try {
    const parsed = new URL(value.replaceAll("&amp;", "&").trim());
    parsed.hash = "";
    parsed.search = "";
    parsed.pathname = normalizeComparablePathname(parsed.pathname);
    return parsed.pathname;
  } catch {
    return normalizeComparablePathname(value.replaceAll("&amp;", "&").trim().split(/[?#]/, 1)[0]);
  }
}

export function htmlHasLeadingImage(html: string, imageUrl: string | null | undefined) {
  if (!html || !imageUrl) {
    return false;
  }

  const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (!match?.[1]) {
    return false;
  }

  return normalizeComparableUrl(match[1]) === normalizeComparableUrl(imageUrl);
}
