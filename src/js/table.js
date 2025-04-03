import { sendDataToMaximo } from "./maximo.js";
import { getActiveCell } from "./main.js";

export const setupDropDownLocalization = () => {
    const translations = {
        "Insert Row": "Вставить строку ниже",
        "Insert Column": "Вставить колонку справа",
        "Delete Row": "Удалить строку",
        "Delete Column": "Удалить колонку",
        "Delete Table": "Удалить таблицу"
    };

    document.querySelectorAll(".wi-menu div").forEach((el) => {
        el.textContent = translations[el.textContent] || el.textContent;
        el.addEventListener("click", updateTableBorders);
    });
};

export const setupTableFunctions = (quillInstance) => {
    const menu = document.querySelector(".wi-menu");

    const buttons = [
        { text: "Увеличить толщину рамок", action: () => changeBorderWidth(1, quillInstance) },
        { text: "Уменьшить толщину рамок", action: () => changeBorderWidth(-1, quillInstance) },
        { text: "Объединить с нижней", action: () => mergeCells("down", quillInstance) },
        { text: "Объединить с правой", action: () => mergeCells("right", quillInstance) }
    ];

    buttons.forEach(({ text, action }) => menu.appendChild(createButton(text, action)));
};

const mergeCells = (direction, quillInstance) => {
    const activeCell = getActiveCell();
    if (!activeCell) return;

    let targetCell = direction === "down"
        ? activeCell.parentElement?.nextElementSibling?.cells[activeCell.cellIndex]
        : activeCell.nextElementSibling;

    if (!targetCell) return;

    if (direction === "down") {
        activeCell.rowSpan += targetCell.rowSpan || 1;
    } else {
        activeCell.colSpan += targetCell.colSpan || 1;
    }

    targetCell.style.display = "none";
    sendDataToMaximo(quillInstance.root.innerHTML);
};

// Функция создания кнопки
const createButton = (text, action) => {
    const button = document.createElement("div");
    button.textContent = text;
    button.classList.add("menu-item");
    button.addEventListener("click", action);
    return button;
};

// Глобальное хранилище для толщины рамки
let borderWidth = 1;

const changeBorderWidth = (arg, quillInstance) => {
    if (arg === 1 && borderWidth < 10) borderWidth++;
    if (arg === -1 && borderWidth > 0) borderWidth--;

    updateTableBorders();
    sendDataToMaximo(quillInstance.root.innerHTML);
};

const updateTableBorders = () => {
    document.querySelectorAll("td, th").forEach((cell) => {
        cell.style.border = `${borderWidth}px solid black`;
    });
};
