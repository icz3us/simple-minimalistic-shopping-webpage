import { NextRequest } from "next/server";
import crypto from "crypto";
import { jsonError, statusFromAuthError } from "@/lib/api";
import { verifyAdmin } from "@/lib/auth/server";

export async function POST(request: NextRequest) {
  try {
    await verifyAdmin(request);
    const formData = await request.formData();
    const file = formData.get("file") as File;
    if (!file) {
      return jsonError("No file provided", 400);
    }

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    const folder = process.env.CLOUDINARY_UPLOAD_FOLDER || "techbits";

    if (!cloudName || !apiKey || !apiSecret) {
      return jsonError("Cloudinary config missing", 500);
    }

    const timestamp = Math.round(new Date().getTime() / 1000);
    const signatureString = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;
    const signature = crypto.createHash("sha1").update(signatureString).digest("hex");

    const cloudinaryFormData = new FormData();
    cloudinaryFormData.append("file", file);
    cloudinaryFormData.append("api_key", apiKey);
    cloudinaryFormData.append("timestamp", timestamp.toString());
    cloudinaryFormData.append("signature", signature);
    cloudinaryFormData.append("folder", folder);

    const uploadResponse = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: "POST",
      body: cloudinaryFormData,
    });

    const uploadResult = await uploadResponse.json();

    if (!uploadResponse.ok) {
      return jsonError(uploadResult.error?.message || "Upload failed", uploadResponse.status);
    }

    return Response.json({ url: uploadResult.secure_url });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Unauthorized", statusFromAuthError(error));
  }
}
