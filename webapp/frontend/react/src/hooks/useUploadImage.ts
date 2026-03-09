import { useMutation } from "@tanstack/react-query";
import { BASE_URL } from "../constants";
import { validateImageFile } from "./imageValidation";

export function useUploadImageMutation() {
  return useMutation({
    mutationFn: async (file: File) => {
      const validationError = validateImageFile(file);
      if (validationError) {
        throw new Error(validationError);
      }
      const formData = new FormData();
      formData.append("image", file);
      const response = await fetch(`${BASE_URL}/uploads`, {
        method: "POST",
        body: formData,
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message ?? "アップロードに失敗しました");
      }
      return response.json() as Promise<{ url: string }>;
    },
  });
}
