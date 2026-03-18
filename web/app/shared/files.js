export async function filesToDocuments(files, options = {}) {
  const { limit = 6 } = options;
  const selected = Array.isArray(files) ? files : [];
  const docs = [];

  for (const file of selected.slice(0, limit)) {
    const content = await file.text();
    const normalized = String(content || "").trim();
    if (!normalized) continue;
    docs.push({
      name: file.name,
      content: normalized,
    });
  }

  return docs;
}

export async function readFileAsBase64(file, options = {}) {
  const {
    readErrorMessage = "Falha ao ler arquivo",
    emptyFileMessage = "Arquivo invalido",
  } = options;

  if (!file) return null;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error(readErrorMessage));
    reader.onload = () => {
      const value = String(reader.result || "");
      const base64 = value.includes(",") ? value.split(",")[1] : value;
      if (!base64) {
        reject(new Error(emptyFileMessage));
        return;
      }
      resolve(base64);
    };
    reader.readAsDataURL(file);
  });
}

export async function filesToBase64(files) {
  const list = Array.isArray(files) ? files : [];
  const converted = await Promise.all(
    list.map(async (file) => {
      const base64 = await readFileAsBase64(file, {
        readErrorMessage: "Falha ao converter imagem",
        emptyFileMessage: "Imagem invalida",
      });
      return {
        base64,
        mimeType: file.type || "image/*",
      };
    }),
  );

  return converted.filter((item) => item.base64);
}