import Quill from "quill";
import Widget from "quill-table-widget";
import ImageResize from "quill-image-resize";
import { setupTableFunctions, setupDropDownLocalization } from "./table.js";
import { sendDataToMaximo } from "./maximo.js";

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

document.addEventListener("click", (event) => {
    if (event.target.tagName === "TD") {
        if (activeCell) activeCell.classList.remove("active");
        activeCell = event.target;
        activeCell.classList.add("active");
    }
});

// Функция для получения активной ячейки
export const getActiveCell = () => activeCell;

quill.on("text-change", () => {
    sendDataToMaximo(quill.root.innerHTML);
});
