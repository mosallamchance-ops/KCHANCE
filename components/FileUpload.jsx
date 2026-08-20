"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

// bucket: 'product-images' (public) or 'receipts' (private)
// pathPrefix: optional folder, e.g. the user's id for receipts (required by storage policy)
// viaServerEndpoint: if set, uploads through this API route (server-side, bypasses client RLS)
export default function FileUpload({ bucket, pathPrefix = "", onUploaded, label, viaServerEndpoint }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [fileName, setFileName] = useState(null);

  async function handleChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);

    if (viaServerEndpoint) {
      const {
        data: { session }
      } = await supabase.auth.getSession();
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(viaServerEndpoint, {
        method: "POST",
        headers: { Authorization: `Bearer ${session?.access_token}` },
        body: formData
      });
      const result = await res.json();
      setUploading(false);
      if (!res.ok) {
        setError(result.error);
        return;
      }
      setFileName(file.name);
      onUploaded(result.url);
      return;
    }

    const ext = file.name.split(".").pop();
    const path = `${pathPrefix ? pathPrefix + "/" : ""}${crypto.randomUUID()}.${ext}`;

    const { error: uploadErr } = await supabase.storage.from(bucket).upload(path, file);
    if (uploadErr) {
      setError(uploadErr.message);
      setUploading(false);
      return;
    }

    if (bucket === "product-images") {
      const { data } = supabase.storage.from(bucket).getPublicUrl(path);
      onUploaded(data.publicUrl);
    } else {
      // Private bucket: store the path, not a public URL. Resolve to a signed URL when displaying.
      onUploaded(path);
    }

    setFileName(file.name);
    setUploading(false);
  }

  return (
    <div>
      <label className="block text-sm text-gray-500 mb-1">{label}</label>
      <input type="file" accept="image/*" onChange={handleChange} className="w-full text-sm" />
      {uploading && <p className="text-xs text-gray-400">...جارِ الرفع</p>}
      {fileName && !uploading && <p className="text-xs text-green-600">تم رفع: {fileName}</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
