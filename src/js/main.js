import Quill from "quill";
import Widget from "quill-table-widget";
import ImageResize from "quill-image-resize";
import { setupTableFunctions, setupDropDownLocalization } from "./table.js";
import { sendDataToMaximo } from "./maximo.js";
import { applyChildStylesToListItems } from "./styleinliner.js"; 

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
            modules: ["Resize", "DisplaySize", "Toolbar"]
        }
    }
});

document.addEventListener("DOMContentLoaded", () => {
    setupDropDownLocalization();
    setupTableFunctions(quill);
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
  if (e.data && e.data.content) {
    const quillRoot = document.querySelector(".ql-editor");

    const match = e.data.content.match(/<!--QUILL_START-->([\s\S]*?)<!--QUILL_END-->/);
    const quillContent = match ? match[1] : e.data.content;

    if (quillRoot && quillRoot.innerHTML !== quillContent) {
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = quillContent;

      applyChildStylesToListItems(tempDiv);
      console.log("[IFRAME] Получено предыдущее сообщение из окна Maximo:", tempDiv.innerHTML);
      quillRoot.innerHTML = tempDiv.innerHTML;

      lastSentContent = quillRoot.innerHTML;
    }
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
