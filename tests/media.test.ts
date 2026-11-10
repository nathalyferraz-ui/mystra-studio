import { test } from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { normalizeImage, readLimitedBody, MAX_UPLOAD_SIZE } from "../features/media/validation";
test("uploads reject invalid signatures, SVG, excessive size and mismatched MIME", async () => {
  await assert.rejects(() => normalizeImage(Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'/>"), "image/svg+xml"));
  await assert.rejects(() => normalizeImage(Buffer.from("not an image"), "image/png"));
  await assert.rejects(() => normalizeImage(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>'), "image/png"), /assinatura/);
  await assert.rejects(() => normalizeImage(Buffer.alloc(MAX_UPLOAD_SIZE + 1), "image/png"));
  const png = await sharp({ create: { width: 4, height: 4, channels: 3, background: "#ab83e8" } }).png().toBuffer();
  await assert.rejects(() => normalizeImage(png, "image/jpeg"));
});
test("uploads re-encode and resize real images without EXIF", async () => {
  const png = await sharp({ create: { width: 3000, height: 2, channels: 3, background: "#ab83e8" } }).withMetadata().png().toBuffer();
  const output = await normalizeImage(png, "image/png");
  const meta = await sharp(output.data).metadata();
  assert.equal(meta.format, "webp");
  assert.equal(meta.width, 2560);
  assert.equal(meta.exif, undefined);
  assert.equal(output.mimeType, "image/webp");
});
test("upload request body is bounded even without Content-Length", async () => {
  const request = new Request("http://localhost/upload", { method: "POST", body: "x".repeat(20) });
  await assert.rejects(() => readLimitedBody(request, 10));
  const small = new Request("http://localhost/upload", { method: "POST", body: "ok" });
  assert.equal((await readLimitedBody(small, 10)).toString(), "ok");
});
