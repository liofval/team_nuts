import { validateImageFile } from "./imageValidation";
import { BASE_URL } from "../constants";

type PresignResponse = {
  url: string;
  key: string;
  objectUrl: string;
};

export async function uploadImageToS3(file: File): Promise<{ url: string }> {
  const validationError = validateImageFile(file);
  if (validationError) throw new Error(validationError);

  console.log("uploadImageToS3: requesting presign for", file.name, file.type);

  const presignResp = await fetch(`${BASE_URL}/s3/presign`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fileName: file.name, contentType: file.type }),
  });
  if (!presignResp.ok) {
    const err = await presignResp.json().catch(() => ({}));
    console.error("uploadImageToS3: presign request failed", err);
    throw new Error(err.message ?? "failed to get presign url");
  }
  const presignData = (await presignResp.json()) as PresignResponse;
  console.log("uploadImageToS3: received presign", presignData);

  console.log("uploadImageToS3: uploading to S3 via presign URL (using ArrayBuffer)");
  const arrayBuffer = await file.arrayBuffer();
  const putResp = await fetch(presignData.url, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: arrayBuffer,
  });
  console.log("uploadImageToS3: S3 PUT response status", putResp.status);
  if (!putResp.ok) {
    const text = await putResp.text().catch(() => "");
    console.error("uploadImageToS3: PUT failed", putResp.status, text);
    throw new Error("failed to upload to s3");
  }

  console.log("uploadImageToS3: upload succeeded, objectUrl=", presignData.objectUrl);

  return { url: presignData.objectUrl };
}

export default uploadImageToS3;
