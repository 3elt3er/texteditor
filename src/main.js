import Widget from "quill-table-widget";
import Quill from "quill";
import ImageResize from "quill-image-resize";
import {translateDropdowns, addThicknessButtons} from "./script.js";

// Настройка допустимых значений размера шрифта
let SizeStyle = Quill.import("attributors/style/size");
SizeStyle.whitelist = ["8px", "10px", "12px", "14px", "16px", "18px", "24px", "36px", "48px", "72px", "100px"];

// Настройка допустимых шрифтов
const Font = Quill.import("attributors/class/font");
Font.whitelist = ["arial", "times-new-roman", "courier-new", "pt-mono"];


Quill.register(Font, true);
Quill.register("modules/tableWidget", Widget);
Quill.register(SizeStyle, true);
Quill.register("modules/imageResize", ImageResize);

// Инициализация редактора Quill
const quill = new Quill("#editor", {
    theme: "snow",
    modules: {
        table: true,
        tableWidget: {
            toolbarOffset: -1,
            maxSize: [5, 6]
        },
        toolbar: "#toolbar",
        imageResize: {
            displayStyles: {
                backgroundColor: "black",
                border: "none",
                color: "white"
            },
            modules: ["Resize", "DisplaySize", "Toolbar"]
        }
    }
});

export const sendDataToMaximo = () => {
    const editorContent = quill.root.innerHTML
    window.parent.postMessage({ action: "updateDescription", content: editorContent }, "*");
}

document.addEventListener("DOMContentLoaded", function () {
    setTimeout(() => {
        translateDropdowns()
        addThicknessButtons()
    }, 500);
});


quill.on("text-change", function() {
    sendDataToMaximo();
});