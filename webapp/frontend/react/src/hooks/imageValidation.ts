const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif"];

export function validateImageFile(file: File): string | null {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return "アップロード可能な形式はJPEG、PNG、GIFのみです";
  }
  if (file.size > MAX_FILE_SIZE) {
    return "ファイルサイズが5MBを超えています";
  }
  return null;
}

export const ACCEPT_IMAGE_TYPES = ALLOWED_TYPES.join(",");
