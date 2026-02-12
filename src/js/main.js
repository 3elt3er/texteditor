import "quill/dist/quill.snow.css";
import Quill from "quill";
import Widget from "quill-table-widget";
import ImageResize from "quill-image-resize";
import { setupTableFunctions, setupDropDownLocalization } from "./table.js";
import { sendDataToMaximo } from "./maximo.js";
import { applyChildStylesToListItems } from "./styleInliner.js";

// Настройки Quill
let SizeStyle = Quill.import("attributors/style/size");
SizeStyle.whitelist = ["8px", "10px", "12px", "14px", "16px", "18px", "24px", "36px", "48px", "72px", "100px"];

const Font = Quill.import("attributors/class/font");
Font.whitelist = ["arial", "times-new-roman", "courier-new", "pt-mono"];

Quill.register(Font, true);
Quill.register("modules/tableWidget", Widget);
Quill.register(SizeStyle, true);
Quill.register("modules/imageResize", ImageResize);

const quill = new Quill("#editor", {
    theme: "snow",
    modules: {
        table: true,
        tableWidget: { toolbarOffset: -1, maxSize: [5, 6] },
        toolbar: "#toolbar",
        imageResize: {
            displayStyles: { backgroundColor: "black", border: "none", color: "white" },
            modules: ["Resize", "DisplaySize"]
        }
    }
});

const enforceImageWidthLimit = (root = quill.root) => {
  root.querySelectorAll("img").forEach((img) => {
    img.style.maxWidth = "1200px";
    img.style.width = "auto";
    img.style.height = "auto";
  });
};

const IMAGE_COMPRESSION_OPTIONS = {
  maxWidth: 1200,
  maxHeight: 1200,
  targetBase64Chars: 600_000,
  targetTolerance: 120_000,
  maxBase64Chars: 1_000_000,
  initialQuality: 0.92,
  minQuality: 0.35,
  qualityStep: 0.07,
  downscaleStep: 0.85
};

const dataUrlBase64Chars = (dataUrl) => (dataUrl.split(",")[1] || "").length;

const dataUrlSizeBytes = (dataUrl) => {
  const base64Chars = dataUrlBase64Chars(dataUrl);
  return Math.ceil((base64Chars * 3) / 4);
};

const loadImageElementFromSrc = (src) => new Promise((resolve, reject) => {
  const img = new Image();
  img.onload = () => {
    resolve(img);
  };
  img.onerror = reject;
  img.src = src;
});

const loadImageElement = (file) => new Promise((resolve, reject) => {
  const objectUrl = URL.createObjectURL(file);
  loadImageElementFromSrc(objectUrl)
    .then((img) => {
      URL.revokeObjectURL(objectUrl);
      resolve(img);
    })
    .catch((err) => {
      URL.revokeObjectURL(objectUrl);
      reject(err);
    });
});

const encodeImageCandidates = (canvas, quality) => {
  const webp = canvas.toDataURL("image/webp", quality);
  const jpeg = canvas.toDataURL("image/jpeg", quality);
  return [webp, jpeg];
};

const compressLoadedImageToDataUrl = async (img, options = IMAGE_COMPRESSION_OPTIONS) => {
  const initialScale = Math.min(
    1,
    options.maxWidth / img.naturalWidth,
    options.maxHeight / img.naturalHeight
  );

  let width = Math.max(1, Math.round(img.naturalWidth * initialScale));
  let height = Math.max(1, Math.round(img.naturalHeight * initialScale));
  let bestDataUrl = "";
  let bestChars = Number.POSITIVE_INFINITY;
  let bestDistance = Number.POSITIVE_INFINITY;

  const targetMin = Math.max(1, options.targetBase64Chars - options.targetTolerance);
  const targetMax = Math.min(options.maxBase64Chars, options.targetBase64Chars + options.targetTolerance);

  while (true) {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d", { alpha: false });
    ctx.drawImage(img, 0, 0, width, height);

    let quality = options.initialQuality;
    while (quality >= options.minQuality) {
      const candidates = encodeImageCandidates(canvas, quality);
      for (const candidate of candidates) {
        const chars = dataUrlBase64Chars(candidate);

        if (chars <= options.maxBase64Chars) {
          const distance = Math.abs(chars - options.targetBase64Chars);
          if (distance < bestDistance) {
            bestDistance = distance;
            bestChars = chars;
            bestDataUrl = candidate;
          }

          if (chars >= targetMin && chars <= targetMax) {
            return candidate;
          }
        } else if (!bestDataUrl && chars < bestChars) {
          bestChars = chars;
          bestDataUrl = candidate;
        }
      }

      quality = Math.max(0, quality - options.qualityStep);
    }

    if (bestDataUrl && bestChars >= targetMin) {
      return bestDataUrl;
    }

    if (width === 1 && height === 1) {
      return bestDataUrl;
    }

    width = Math.max(1, Math.floor(width * options.downscaleStep));
    height = Math.max(1, Math.floor(height * options.downscaleStep));
  }
};

const compressImageToDataUrl = async (file, options = IMAGE_COMPRESSION_OPTIONS) => {
  const img = await loadImageElement(file);
  return compressLoadedImageToDataUrl(img, options);
};

const compressImageSrcToDataUrl = async (imageSrc, options = IMAGE_COMPRESSION_OPTIONS) => {
  const img = await loadImageElementFromSrc(imageSrc);
  return compressLoadedImageToDataUrl(img, options);
};

const insertImageDataUrl = (dataUrl) => {
  const selection = quill.getSelection(true);
  const index = selection ? selection.index : quill.getLength();
  quill.insertEmbed(index, "image", dataUrl, "user");
  quill.insertText(index + 1, "\n", "user");
  quill.setSelection(index + 2, 0, "silent");
};

const insertCompressedImages = async (files) => {
  for (const file of files) {
    const compressed = await compressImageToDataUrl(file);
    const base64Chars = dataUrlBase64Chars(compressed);
    console.log(
      `[IMAGE] ${file.name || "clipboard-image"}: ${Math.round(file.size / 1024)}KB -> ${Math.round(dataUrlSizeBytes(compressed) / 1024)}KB, base64Chars=${base64Chars}`
    );
    insertImageDataUrl(compressed);
  }
};

quill.root.addEventListener("paste", async (event) => {
  const items = Array.from(event.clipboardData?.items || []);
  const imageFiles = items
    .filter((item) => item.kind === "file" && item.type.startsWith("image/"))
    .map((item) => item.getAsFile())
    .filter(Boolean);

  if (!imageFiles.length) return;

  event.preventDefault();
  try {
    await insertCompressedImages(imageFiles);
  } catch (error) {
    console.error("[IMAGE] Ошибка при вставке изображения:", error);
  }
});

quill.root.addEventListener("drop", async (event) => {
  const imageFiles = Array.from(event.dataTransfer?.files || [])
    .filter((file) => file.type.startsWith("image/"));

  if (!imageFiles.length) return;

  event.preventDefault();
  try {
    await insertCompressedImages(imageFiles);
  } catch (error) {
    console.error("[IMAGE] Ошибка при drop изображения:", error);
  }
});

document.addEventListener("DOMContentLoaded", () => {
    setupDropDownLocalization();
    setupTableFunctions(quill);
    enforceImageWidthLimit();
});

let activeCell = null;
let lastCursorPosition = null;

// Сохраняем позицию курсора перед потерей фокуса
quill.on('selection-change', (range) => {
  if (range) {
    lastCursorPosition = range;
  }
});

document.addEventListener("click", (event) => {
    if (event.target.tagName === "TD") {
        if (activeCell) activeCell.classList.remove("active");
        activeCell = event.target;
        activeCell.classList.add("active");
    }
});

// Функция для получения активной ячейки
export const getActiveCell = () => activeCell;

window.addEventListener("message", function(e) {
  const incomingQuillHtml = typeof e.data?.quill === "string"
    ? e.data.quill
    : typeof e.data?.content === "string"
      ? e.data.content
      : null;
  if (!incomingQuillHtml) return;

  const quillRoot = document.querySelector(".ql-editor");
  if (quillRoot && quillRoot.innerHTML !== incomingQuillHtml) {
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = incomingQuillHtml;

    applyChildStylesToListItems(tempDiv);
    console.log("[IFRAME] Получено предыдущее сообщение из окна Maximo:", tempDiv.innerHTML);
    quillRoot.innerHTML = tempDiv.innerHTML;
    enforceImageWidthLimit(quillRoot);

    lastSentContent = quillRoot.innerHTML;
  }
}, { once: true });


window.addEventListener("message", function(e) {
  if (e.data && e.data.action === "restoreFocus") {
    if (lastCursorPosition) {
      quill.focus();
      quill.setSelection(lastCursorPosition.index, lastCursorPosition.length || 0);
    } else {
      quill.focus();
      const len = quill.getLength();
      quill.setSelection(len, 0);
    }
  }
});

let debounceTimer = null;
let isDirty = false;
let lastSentContent = getCurrentContent();
let isNormalizingImages = false;

const editorContainer = document.getElementById('editorWindow');

function getCurrentContent() {
  return quill.root.innerHTML.trim();
}

function save() {
  const currentContent = getCurrentContent();
  if (!isDirty) return;
  if (currentContent === lastSentContent) return;

  sendDataToMaximo();
  lastSentContent = currentContent;
  isDirty = false;
}

const getLargeInsertedImages = (delta) => {
  const oversize = [];
  let index = 0;

  for (const op of delta?.ops || []) {
    if (typeof op.retain === "number") {
      index += op.retain;
      continue;
    }
    if (typeof op.delete === "number") {
      continue;
    }
    if (typeof op.insert === "string") {
      index += op.insert.length;
      continue;
    }
    if (op.insert && typeof op.insert.image === "string") {
      const imageSrc = op.insert.image;
      if (imageSrc.startsWith("data:")) {
        const base64Chars = dataUrlBase64Chars(imageSrc);
        if (base64Chars > IMAGE_COMPRESSION_OPTIONS.maxBase64Chars) {
          oversize.push({ index, imageSrc, base64Chars });
        }
      }
      index += 1;
      continue;
    }
    if (op.insert) {
      index += 1;
    }
  }

  return oversize;
};

const normalizeLargeInsertedImages = async (delta) => {
  if (isNormalizingImages) return;

  const oversizeImages = getLargeInsertedImages(delta);
  if (!oversizeImages.length) return;

  isNormalizingImages = true;
  try {
    for (const imageInfo of oversizeImages) {
      const compressed = await compressImageSrcToDataUrl(imageInfo.imageSrc);
      const compressedChars = dataUrlBase64Chars(compressed);

      quill.deleteText(imageInfo.index, 1, "silent");
      quill.insertEmbed(imageInfo.index, "image", compressed, "silent");

      console.log(
        `[IMAGE] recompressed at index ${imageInfo.index}: base64Chars=${imageInfo.base64Chars} -> ${compressedChars}`
      );
    }
  } catch (error) {
    console.error("[IMAGE] Ошибка при авто-сжатии вставленного изображения:", error);
  } finally {
    isNormalizingImages = false;
  }
};

quill.on('text-change', (delta) => {
  isDirty = true;
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => save(), 5000);

  const insertedImages = (delta?.ops || [])
    .map((op) => op?.insert?.image)
    .filter(Boolean);
  insertedImages.forEach((imageSrc, idx) => {
    const base64Chars = imageSrc.startsWith("data:")
      ? dataUrlBase64Chars(imageSrc)
      : imageSrc.length;
    console.log(`[IMAGE] inserted #${idx + 1}: base64Chars=${base64Chars}`);
  });
  void normalizeLargeInsertedImages(delta);
  enforceImageWidthLimit();

  const range = quill.getSelection();
  if (range) {
    lastCursorPosition = range;
  }
});

editorContainer.addEventListener('mouseleave', (e) => {
  const related = e.relatedTarget || e.toElement;
  if (!editorContainer.contains(related)) {
    save();
  }
});
