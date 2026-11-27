/* ============================================================
   English Teacher — Cloudflare R2 fayl xizmati
   ------------------------------------------------------------
   Sayt barcha fayllarni shu worker orqali Cloudflare R2 ga yuklaydi.
   Ma'lumotlar (jadval ustunlari) Supabase'da, fayllarning o'zi R2 da.
   URL formati: PUBLIC_BASE_URL + "/" + key

   Endpointlar:
     GET  /                      — holat (health)
     GET  /health                — holat
     GET  /list?prefix=&limit=   — kalitlar ro'yxati (ixtiyoriy, tekshirish uchun)
     GET  /object?path=          — fayl metadatasi (mavjudligini tekshirish)
     POST /verify-turnstile      — Turnstile tekshiruvi (o'zgarmagan)
     POST /  (multipart yoki raw) — fayl yuklash
     PUT  /  (raw)               — fayl yuklash
     DELETE ?path=               — bitta faylni o'chirish
     DELETE ?prefix=             — papka/prefix bo'yicha barcha fayllarni o'chirish

   Env (Cloudflare dashboard → Worker → Settings → Variables):
     R2_BUCKET          — R2 bucket binding (majburiy)
     PUBLIC_BASE_URL    — public R2 domeni (ixtiyoriy; standart pastda)
     TURNSTILE_SECRET   — Turnstile maxfiy kaliti (ixtiyoriy)
     MAX_UPLOAD_MB      — maksimal fayl hajmi, MB (ixtiyoriy; standart 100)

   Eslatma: Cloudflare Worker so'rov tanasi limiti odatda 100 MB
   (ba'zi rejalarda 500 MB). Kattaroq film uchun limitni oshirish
   Cloudflare tomonida talab qilinadi; kod aniq xabar qaytaradi.
   ============================================================ */

const DEFAULT_PUBLIC_BASE = "https://pub-836df3817ab64cee9075b55d51fe6061.r2.dev";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, HEAD, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, x-file-path, x-file-type, x-file-name",
  "Access-Control-Expose-Headers": "Content-Length, ETag",
  "Access-Control-Max-Age": "86400",
};

function jsonResp(obj, status) {
  return new Response(JSON.stringify(obj), {
    status: status ? status : 200,
    headers: Object.assign({}, corsHeaders, {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    }),
  });
}

/* Yo'lni xavfsiz qiladi: bosh slash, bo'sh segment, "." va ".." olib tashlanadi. */
function cleanPath(p) {
  const raw = String(p == null ? "" : p).replace(/\\/g, "/").trim();
  return raw
    .split("/")
    .map((s) => s.trim())
    .filter((s) => s && s !== "." && s !== "..")
    .join("/");
}

function makeSafeName(name) {
  if (!name) return "file";
  return String(name)
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_{2,}/g, "_")
    .slice(-180) || "file";
}

function publicBase(env) {
  const base = String((env && env.PUBLIC_BASE_URL) || DEFAULT_PUBLIC_BASE);
  return base.replace(/\/+$/, "");
}

function publicUrl(env, key) {
  return publicBase(env) + "/" + key;
}

function maxBytes(env) {
  const mb = Number((env && env.MAX_UPLOAD_MB) || 0);
  const safe = mb > 0 && mb <= 500 ? mb : 100;
  return safe * 1024 * 1024;
}

function fmtMb(bytes) {
  return Math.round((Number(bytes) / (1024 * 1024)) * 10) / 10;
}

function bucketOf(env) {
  return env && env.R2_BUCKET ? env.R2_BUCKET : null;
}

async function deletePrefix(bucket, prefix, max) {
  const deleted = [];
  let cursor = undefined;
  const limit = Math.max(1, Math.min(Number(max) || 1000, 1000));
  while (deleted.length < limit) {
    const page = await bucket.list({
      prefix: prefix,
      limit: Math.min(1000, limit - deleted.length),
      cursor: cursor,
    });
    const keys = (page.objects || []).map((o) => o.key);
    if (!keys.length) break;
    await bucket.delete(keys);
    deleted.push.apply(deleted, keys);
    if (!page.truncated) break;
    cursor = page.cursor;
    if (!cursor) break;
  }
  return deleted;
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    const url = new URL(request.url);
    const bucket = bucketOf(env);
    if (!bucket) {
      return jsonResp(
        { ok: false, error: "R2_BUCKET binding sozlanmagan" },
        500
      );
    }

    /* ---------------- GET: holat, ro'yxat, metadata ---------------- */
    if (request.method === "GET" || request.method === "HEAD") {
      if (url.pathname === "/" || url.pathname === "/health") {
        return jsonResp(
          {
            ok: true,
            service: "teachermuzaffar-r2-upload",
            bucket: true,
            publicBase: publicBase(env),
            maxUploadMB: Math.round(maxBytes(env) / (1024 * 1024)),
          },
          200
        );
      }

      if (url.pathname === "/list") {
        const prefix = cleanPath(url.searchParams.get("prefix") || "");
        const limitRaw = Number(url.searchParams.get("limit") || 100);
        const limit = Math.max(1, Math.min(limitRaw || 100, 1000));
        try {
          const page = await bucket.list({ prefix: prefix, limit: limit });
          const items = (page.objects || []).map((o) => ({
            key: o.key,
            size: o.size,
            uploaded: o.uploaded ? new Date(o.uploaded).toISOString() : null,
            etag: o.etag || "",
            url: publicUrl(env, o.key),
          }));
          return jsonResp(
            { ok: true, prefix: prefix, truncated: !!page.truncated, items: items },
            200
          );
        } catch (err) {
          return jsonResp(
            { ok: false, error: (err && err.message) || "List error" },
            500
          );
        }
      }

      if (url.pathname === "/object") {
        const key = cleanPath(url.searchParams.get("path") || "");
        if (!key) return jsonResp({ ok: false, error: "No path provided" }, 400);
        try {
          const head = await bucket.head(key);
          if (!head) {
            return jsonResp({ ok: false, found: false, key: key }, 404);
          }
          return jsonResp(
            {
              ok: true,
              found: true,
              key: key,
              size: head.size,
              etag: head.httpEtag || head.etag || "",
              uploaded: head.uploaded ? new Date(head.uploaded).toISOString() : null,
              contentType:
                (head.httpMetadata && head.httpMetadata.contentType) ||
                "application/octet-stream",
              url: publicUrl(env, key),
            },
            200
          );
        } catch (err) {
          return jsonResp(
            { ok: false, error: (err && err.message) || "Head error" },
            500
          );
        }
      }

      return jsonResp({ ok: false, error: "Not found" }, 404);
    }

    /* ---------------- POST: Turnstile ---------------- */
    if (request.method === "POST" && url.pathname === "/verify-turnstile") {
      try {
        const body = await request.json().catch(() => null);
        const token = body && body.token ? String(body.token) : "";
        if (!token) {
          return jsonResp({ ok: false, error: "Missing Turnstile token" }, 400);
        }
        const secret = env.TURNSTILE_SECRET ? String(env.TURNSTILE_SECRET) : "";
        if (!secret) {
          return jsonResp(
            { ok: false, error: "TURNSTILE_SECRET not configured" },
            500
          );
        }
        /* Cloudflare'ning test kalitlari (1x/2x/3x...) haqiqiy tokenni ham rad
           etadi — saytga hech kim kira olmaydi. Aniq sozlama xatosi sifatida
           qaytaramiz (sayt buni fail-open deb qabul qiladi). */
        if (/^[123]x0{18,}/i.test(secret)) {
          return jsonResp(
            {
              ok: false,
              error:
                "TURNSTILE_SECRET test kalit — Cloudflare dashboarddagi haqiqiy secret bilan almashtiring",
              "error-codes": ["invalid-input-secret"],
            },
            500
          );
        }
        /* Har token bir marta tekshiriladi. Tarmoq xatosi yoki takroriy so'rovda
           Cloudflare "timeout-or-duplicate" qaytarmasligi uchun token bo'yicha
           barqaror idempotency_key yuboriladi. */
        const digest = await crypto.subtle.digest(
          "SHA-256",
          new TextEncoder().encode(token)
        );
        const hex = Array.from(new Uint8Array(digest))
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");
        const idempotencyKey =
          hex.slice(0, 8) + "-" + hex.slice(8, 12) + "-4" + hex.slice(13, 16) +
          "-a" + hex.slice(17, 20) + "-" + hex.slice(20, 32);
        const form = new FormData();
        form.append("secret", secret);
        form.append("response", token);
        form.append("idempotency_key", idempotencyKey);
        const clientIp = request.headers.get("CF-Connecting-IP");
        if (clientIp) form.append("remoteip", clientIp);
        const verifyRes = await fetch(
          "https://challenges.cloudflare.com/turnstile/v0/siteverify",
          {
            method: "POST",
            body: form,
            signal:
              typeof AbortSignal !== "undefined" && AbortSignal.timeout
                ? AbortSignal.timeout(8000)
                : undefined,
          }
        );
        const verifyData = await verifyRes.json();
        return jsonResp(
          { ok: Boolean(verifyData.success), data: verifyData },
          verifyData.success ? 200 : 403
        );
      } catch (err) {
        return jsonResp(
          {
            ok: false,
            error: (err && err.message) || "Turnstile verify error",
          },
          500
        );
      }
    }

    /* ---------------- DELETE: bitta fayl yoki prefix ---------------- */
    if (request.method === "DELETE") {
      try {
        const prefixRaw =
          url.searchParams.get("prefix") ||
          request.headers.get("x-file-prefix") ||
          "";
        const prefix = cleanPath(prefixRaw);
        if (prefix) {
          if (prefix.length < 3 || prefix === "uploads") {
            return jsonResp(
              { ok: false, error: "Prefix juda qisqa — xavfsizlik uchun rad etildi" },
              400
            );
          }
          const dryRun = url.searchParams.get("dryRun") === "1";
          if (dryRun) {
            const page = await bucket.list({ prefix: prefix, limit: 1000 });
            return jsonResp(
              {
                ok: true,
                dryRun: true,
                prefix: prefix,
                keys: (page.objects || []).map((o) => o.key),
              },
              200
            );
          }
          const deleted = await deletePrefix(bucket, prefix, 1000);
          return jsonResp(
            { ok: true, prefix: prefix, deletedCount: deleted.length, deleted: deleted },
            200
          );
        }

        const p1 = url.searchParams.get("path");
        const p2 = request.headers.get("x-file-path");
        const key = cleanPath(p1 ? p1 : p2);
        if (!key) {
          return jsonResp(
            { ok: false, error: "No path or prefix provided" },
            400
          );
        }
        await bucket.delete(key);
        return jsonResp({ ok: true, deleted: key }, 200);
      } catch (err) {
        return jsonResp(
          { ok: false, error: (err && err.message) || "Delete error" },
          500
        );
      }
    }

    /* ---------------- POST/PUT: fayl yuklash ---------------- */
    if (request.method !== "POST" && request.method !== "PUT") {
      return jsonResp({ ok: false, error: "Method not allowed" }, 405);
    }

    try {
      const max = maxBytes(env);
      const declared = Number(request.headers.get("content-length") || 0);
      if (declared && declared > max) {
        return jsonResp(
          {
            ok: false,
            error:
              "Fayl juda katta: " +
              fmtMb(declared) +
              " MB (limit " +
              fmtMb(max) +
              " MB)",
          },
          413
        );
      }

      const cth = String(request.headers.get("content-type") || "");
      let key = "";
      let bodyData = null;
      let fileType = "application/octet-stream";
      let originalName = "";

      if (cth.includes("multipart/form-data")) {
        const formData = await request.formData();
        const file = formData.get("file");
        const customPath = formData.get("path");
        if (!file || typeof file === "string") {
          return jsonResp({ ok: false, error: "No file provided" }, 400);
        }
        originalName = file.name || "";
        const safeName = makeSafeName(originalName);
        key = customPath
          ? cleanPath(customPath)
          : "uploads/" + Date.now() + "_" + safeName;
        if (!key) {
          return jsonResp({ ok: false, error: "Invalid path" }, 400);
        }
        if (!/\.[a-z0-9]{1,10}$/i.test(key) && safeName) {
          key = key.replace(/\/+$/, "") + "/" + safeName;
        }
        fileType = file.type || "application/octet-stream";
        bodyData = await file.arrayBuffer();
      } else {
        const p1 = url.searchParams.get("path");
        const p2 = request.headers.get("x-file-path");
        const rawPath = p1 || p2 || "uploads/" + Date.now() + "_file";
        key = cleanPath(rawPath);
        if (!key) {
          return jsonResp({ ok: false, error: "Invalid path" }, 400);
        }
        const t1 = request.headers.get("x-file-type");
        fileType = t1 || cth || "application/octet-stream";
        originalName = String(request.headers.get("x-file-name") || "");
        bodyData = await request.arrayBuffer();
      }

      if (!bodyData || bodyData.byteLength === 0) {
        return jsonResp({ ok: false, error: "Fayl bo'sh" }, 400);
      }
      if (bodyData.byteLength > max) {
        return jsonResp(
          {
            ok: false,
            error:
              "Fayl juda katta: " +
              fmtMb(bodyData.byteLength) +
              " MB (limit " +
              fmtMb(max) +
              " MB)",
          },
          413
        );
      }

      await bucket.put(key, bodyData, {
        httpMetadata: {
          contentType: fileType,
          cacheControl: "public, max-age=31536000, immutable",
        },
        customMetadata: {
          originalName: originalName ? originalName.slice(0, 200) : "",
          uploadedAt: new Date().toISOString(),
        },
      });

      return jsonResp(
        {
          ok: true,
          url: publicUrl(env, key),
          key: key,
          size: bodyData.byteLength,
          contentType: fileType,
        },
        200
      );
    } catch (err) {
      return jsonResp(
        { ok: false, error: (err && err.message) || "Upload error" },
        500
      );
    }
  },
};
