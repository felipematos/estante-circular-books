/** Resizes to max 1200px and re-encodes as JPEG, which also strips EXIF/GPS metadata. */
export async function prepareCover(file: File): Promise<Blob> {
  if (!["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"].includes(file.type) && !file.type.startsWith("image/"))
    throw new Error("Envie uma foto (JPG, PNG ou WEBP).");
  if (file.size > 15 * 1024 * 1024) throw new Error("Foto muito grande (máx. 15 MB).");
  const bmp = await createImageBitmap(file).catch(() => {
    throw new Error("Não conseguimos ler essa foto. Tente outra.");
  });
  const scale = Math.min(1, 1200 / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  return new Promise((res, rej) =>
    canvas.toBlob((b) => (b ? res(b) : rej(new Error("Falha ao processar a foto."))), "image/jpeg", 0.85),
  );
}
