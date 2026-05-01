import { createHash } from "crypto";
import { NextRequest } from "next/server";
import { jsonError, statusFromAuthError } from "@/lib/api";
import { verifyAdmin } from "@/lib/auth/server";

const maxImageSize = 8 * 1024 * 1024;

function signCloudinaryParams(params: Record<string, string>, apiSecret: string) {
  const signatureBase = Object.entries(params)
    .filter(([, value]) => value)
    .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");

  return createHash("sha1").update(`${signatureBase}${apiSecret}`).digest("hex");
}

export async function POST(request: NextRequest) {
  try {
    await verifyAdmin(request);

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    const folder = process.env.CLOUDINARY_UPLOAD_FOLDER || "techbits";

    if (!cloudName || !apiKey || !apiSecret) {
      return jsonError("Missing Cloudinary server configuration.", 500);
    }

    const body = await request.formData();
    const file = body.get("file");

    if (!(file instanceof File)) {
      return jsonError("Missing image file.", 400);
    }

    if (!file.type.startsWith("image/")) {
      return jsonError("Only image uploads are allowed.", 400);
    }

    if (file.size > maxImageSize) {
      return jsonError("Image must be 8MB or smaller.", 400);
    }

    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signedParams = { folder, timestamp };
    const signature = signCloudinaryParams(signedParams, apiSecret);

    const uploadBody = new FormData();
    uploadBody.set("file", file);
    uploadBody.set("api_key", apiKey);
    uploadBody.set("folder", folder);
    uploadBody.set("timestamp", timestamp);
    uploadBody.set("signature", signature);

    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: "POST",
      body: uploadBody,
    });
    const result = await response.json();

    if (!response.ok) {
      return jsonError(result.error?.message ?? "Cloudinary upload failed.", response.status);
    }

    return Response.json({
      secure_url: result.secure_url,
      public_id: result.public_id,
    });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Unauthorized", statusFromAuthError(error));
  }
}
