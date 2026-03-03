import "quill/dist/quill.snow.css";
import Quill from "quill";
import Widget from "quill-table-widget";
import ImageResize from "quill-image-resize";
import { setupTableFunctions, setupDropDownLocalization } from "./table.js";
import { sendDataToMaximo } from "./maximo.js";
import { applyChildStylesToListItems } from "./styleInliner.js";

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

let selectedImageNode = null;

const clearSelectedImageNode = () => {
  if (selectedImageNode && !selectedImageNode.isConnected) {
    selectedImageNode = null;
  }
};

quill.root.addEventListener("click", (event) => {
  const target = event.target;
  if (target && target.tagName === "IMG") {
    selectedImageNode = target;
    return;
  }
  selectedImageNode = null;
});

document.addEventListener("keyup", (event) => {
  if (event.key !== "Backspace" && event.key !== "Delete") return;

  clearSelectedImageNode();
  if (!selectedImageNode) return;
  if (!quill.root.contains(selectedImageNode)) return;

  const blot = Quill.find(selectedImageNode);
  if (blot && typeof blot.deleteAt === "function") {
    blot.deleteAt(0);
  } else {
    selectedImageNode.remove();
  }

  selectedImageNode = null;
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
}, true);

const enforceImageWidthLimit = (root = quill.root) => {
  root.querySelectorAll("img").forEach((img) => {
    const visualMaxWidth = Number(img.dataset.visualMaxWidth || 0);
    if (visualMaxWidth > 0) {
      img.style.maxWidth = `${visualMaxWidth}px`;
      img.style.height = "auto";
      return;
    }
    img.style.maxWidth = "640px";
    img.style.height = "auto";
  });
};

const IMAGE_COMPRESSION_OPTIONS = {
  maxWidth: 640,
  maxBase64Chars: 450_000,
  initialQuality: 1,
  minQuality: 0.35,
  qualityStep: 0.1
};
const EDITOR_TOTAL_CHARS_LIMIT = 450_000;

const dataUrlBase64Chars = (dataUrl) => (dataUrl.split(",")[1] || "").length;

const readFileAsDataUrl = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result || ""));
  reader.onerror = reject;
  reader.readAsDataURL(file);
});

const loadImageElementFromSrc = (src) => new Promise((resolve, reject) => {
  const img = new Image();
  img.onload = () => {
    resolve(img);
  };
  img.onerror = reject;
  img.src = src;
});

const encodeLossyImageCandidates = (canvas, quality) => {
  const jpeg = canvas.toDataURL("image/jpeg", quality);
  return [jpeg];
};

const compressLoadedImageToDataUrl = async (img, options = IMAGE_COMPRESSION_OPTIONS) => {
  const scale = img.naturalWidth > options.maxWidth ? options.maxWidth / img.naturalWidth : 1;
  const width = Math.max(1, Math.round(img.naturalWidth * scale));
  const height = Math.max(1, Math.round(img.naturalHeight * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { alpha: false });
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, width, height);

  const losslessDataUrl = canvas.toDataURL("image/png");
  const losslessChars = dataUrlBase64Chars(losslessDataUrl);
  if (losslessChars <= options.maxBase64Chars) {
    return {
      dataUrl: losslessDataUrl,
      compressionMode: "resize_only",
      initialBase64Chars: losslessChars,
      finalBase64Chars: losslessChars
    };
  }

  let bestDataUrl = losslessDataUrl;
  let bestChars = losslessChars;
  const initialBestChars = losslessChars;
  let quality = options.initialQuality;
  while (quality >= options.minQuality) {
    const candidates = encodeLossyImageCandidates(canvas, quality);
    let bestUnderLimitAtThisQuality = null;
    let bestUnderLimitChars = -1;

    for (const candidate of candidates) {
      const chars = dataUrlBase64Chars(candidate);
      if (chars < bestChars) {
        bestChars = chars;
        bestDataUrl = candidate;
      }
      if (chars <= options.maxBase64Chars) {
        if (chars > bestUnderLimitChars) {
          bestUnderLimitChars = chars;
          bestUnderLimitAtThisQuality = candidate;
        }
      }
    }

    if (bestUnderLimitAtThisQuality) {
      return {
        dataUrl: bestUnderLimitAtThisQuality,
        compressionMode: "quality_reduced",
        initialBase64Chars: initialBestChars,
        finalBase64Chars: bestUnderLimitChars
      };
    }

    quality = Math.max(0, quality - options.qualityStep);
  }

  return {
    dataUrl: bestDataUrl,
    compressionMode: "quality_reduced",
    initialBase64Chars: initialBestChars,
    finalBase64Chars: bestChars
  };
};

const compressImageToDataUrl = async (file, options = IMAGE_COMPRESSION_OPTIONS) => {
  const maxBytesFromBase64Limit = Math.floor((options.maxBase64Chars * 3) / 4);
  if (typeof file.size === "number" && file.size > 0 && file.size <= maxBytesFromBase64Limit) {
    const originalDataUrlFastPath = await readFileAsDataUrl(file);
    const imgFastPath = await loadImageElementFromSrc(originalDataUrlFastPath);
    return {
      dataUrl: originalDataUrlFastPath,
      compressionMode: "visual_resize_only",
      initialBase64Chars: dataUrlBase64Chars(originalDataUrlFastPath),
      finalBase64Chars: dataUrlBase64Chars(originalDataUrlFastPath),
      visualMaxWidth: imgFastPath.naturalWidth > options.maxWidth ? options.maxWidth : null
    };
  }

  const originalDataUrl = await readFileAsDataUrl(file);
  const originalBase64Chars = dataUrlBase64Chars(originalDataUrl);
  const img = await loadImageElementFromSrc(originalDataUrl);

  if (originalBase64Chars <= options.maxBase64Chars) {
    return {
      dataUrl: originalDataUrl,
      compressionMode: "visual_resize_only",
      initialBase64Chars: originalBase64Chars,
      finalBase64Chars: originalBase64Chars,
      visualMaxWidth: img.naturalWidth > options.maxWidth ? options.maxWidth : null
    };
  }

  return compressLoadedImageToDataUrl(img, options);
};

const insertImageDataUrl = (dataUrl, options = {}) => {
  const selection = quill.getSelection(true);
  const index = selection ? selection.index : quill.getLength();
  quill.insertEmbed(index, "image", dataUrl, "user");
  const [leaf] = quill.getLeaf(index);
  const imageNode = leaf?.domNode;
  if (imageNode && imageNode.tagName === "IMG") {
    if (options.visualMaxWidth) {
      imageNode.dataset.visualMaxWidth = String(options.visualMaxWidth);
      imageNode.style.maxWidth = `${options.visualMaxWidth}px`;
      imageNode.style.height = "auto";
    } else {
      delete imageNode.dataset.visualMaxWidth;
    }
  }
  quill.insertText(index + 1, "\n", "user");
  quill.setSelection(index + 2, 0, "silent");
};

const insertCompressedImages = async (files) => {
  for (const file of files) {
    const compressedResult = await compressImageToDataUrl(file);
    const { dataUrl, visualMaxWidth } = compressedResult;

    const currentContentChars = getCurrentContent().length;
    const projectedTotalChars = currentContentChars + dataUrl.length;
    if (projectedTotalChars > EDITOR_TOTAL_CHARS_LIMIT) {
      showEditorWarning("Слишком большой объем данных. Вставьте изображение в следующий раздел");
      continue;
    }

    insertImageDataUrl(dataUrl, { visualMaxWidth });
  }
};

const pickImageFile = () => new Promise((resolve) => {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";
  input.onchange = () => resolve(input.files?.[0] || null);
  input.click();
});

const toolbar = quill.getModule("toolbar");
if (toolbar) {
  toolbar.addHandler("image", async () => {
    const file = await pickImageFile();
    if (!file) return;
    try {
      await insertCompressedImages([file]);
    } catch {
      showEditorWarning("Не удалось вставить изображение");
    }
  });
}

quill.root.addEventListener("paste", async (event) => {
  const items = Array.from(event.clipboardData?.items || []);
  const itemFiles = items
    .filter((item) => item.kind === "file" && item.type.startsWith("image/"))
    .map((item) => item.getAsFile())
    .filter(Boolean);
  const clipboardFiles = Array.from(event.clipboardData?.files || [])
    .filter((file) => file.type.startsWith("image/"));
  const imageFile = (itemFiles[0] || clipboardFiles[0] || null);

  if (!imageFile) return;

  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
  try {
    await insertCompressedImages([imageFile]);
  } catch {
    showEditorWarning("Не удалось вставить изображение из буфера обмена");
  }
}, true);

quill.root.addEventListener("drop", async (event) => {
  const imageFiles = Array.from(event.dataTransfer?.files || [])
    .filter((file) => file.type.startsWith("image/"));

  if (!imageFiles.length) return;

  event.preventDefault();
  event.stopPropagation();
  try {
    await insertCompressedImages(imageFiles);
  } catch {
    showEditorWarning("Не удалось вставить изображение перетаскиванием");
  }
}, true);


document.addEventListener("DOMContentLoaded", () => {
    setupDropDownLocalization();
    setupTableFunctions(quill);
    enforceImageWidthLimit();
});

let activeCell = null;
let lastCursorPosition = null;

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

const editorContainer = document.getElementById('editorWindow');

function getCurrentContent() {
  return quill.root.innerHTML.trim();
}

function showEditorWarning(message) {
  const warningId = "editor-warning";
  let warning = document.getElementById(warningId);
  if (!warning) {
    warning = document.createElement("div");
    warning.id = warningId;
    warning.style.margin = "8px 0";
    warning.style.padding = "10px 12px";
    warning.style.border = "1px solid #d9534f";
    warning.style.background = "#fcebea";
    warning.style.color = "#8a1f1c";
    warning.style.fontSize = "13px";
    warning.style.borderRadius = "4px";
    const toolbarNode = document.getElementById("toolbar");
    if (toolbarNode?.parentNode) {
      toolbarNode.parentNode.insertBefore(warning, toolbarNode.nextSibling);
    } else {
      document.body.insertBefore(warning, document.body.firstChild);
    }
  }

  warning.textContent = message;
  warning.style.display = "block";
  clearTimeout(showEditorWarning.hideTimer);
  showEditorWarning.hideTimer = setTimeout(() => {
    if (warning) warning.style.display = "none";
  }, 6000);
}

function save() {
  const currentContent = getCurrentContent();
  if (!isDirty) return;
  if (currentContent === lastSentContent) return;

  sendDataToMaximo();
  lastSentContent = currentContent;
  isDirty = false;
}

quill.on('text-change', () => {
  isDirty = true;
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => save(), 5000);

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
