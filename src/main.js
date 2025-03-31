import Widget from "quill-table-widget";
import Quill from "quill";
import ImageResize from "quill-image-resize";
import {translateDropdowns} from "./script.js";

const BlockEmbed = Quill.import('blots/block/embed');

class SvgBlot extends BlockEmbed {
    static create(value) {
        let node = super.create();
        node.innerHTML = value;
        return node;
    }
    static value(node) {
        return node.innerHTML;
    }
}
SvgBlot.blotName = 'svg';
SvgBlot.tagName = 'div';


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
Quill.register(SvgBlot);

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

const insertShape = (type) => {
    let svg = "";

    if (type === "arrow") {
        svg = `<svg class="draggable shape" width="5%" height="5%" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M21 12L14 5V9H3.8C3.51997 9 3.37996 9 3.273 9.0545C3.17892 9.10243 3.10243 9.17892 3.0545 9.273C3 9.37996 3 9.51997 3 9.8V14.2C3 14.48 3 14.62 3.0545 14.727C3.10243 14.8211 3.17892 14.8976 3.273 14.9455C3.37996 15 3.51997 15 3.8 15H14V19L21 12Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>`;
    } else if (type === "circle") {
        svg = `<svg class="draggable shape" width="50" height="50">
                  <circle cx="25" cy="25" r="20" stroke="black" stroke-width="3" fill="transparent"/>
               </svg>`;
    } else if (type === "rectangle") {
        svg = `<svg class="draggable shape" width="60" height="40">
                  <rect width="60" height="40" stroke="black" stroke-width="3" fill="transparent"/>
               </svg>`;
    }

    const range = quill.getSelection();
    const index = range ? range.index : quill.getLength(); // если курсора нет, вставляем в конец
    quill.insertEmbed(index, 'svg', svg, 'user');
}

const sendDataToMaximo = () => {
    const editorContent = quill.root.innerHTML
    window.parent.postMessage({ action: "updateDescription", content: editorContent }, "*");
}

document.addEventListener("DOMContentLoaded", function () {
    setTimeout(translateDropdowns, 500); // Даем время на отрисовку
    document.getElementById("insert-arrow")?.addEventListener("click", () => insertShape("arrow"));
    document.getElementById("insert-circle")?.addEventListener("click", () => insertShape("circle"));
    document.getElementById("insert-rectangle")?.addEventListener("click", () => insertShape("rectangle"));
});


quill.on("text-change", function() {
    sendDataToMaximo();
});