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
        { text: "Объединить с правой", action: () => mergeCells("right", quillInstance) },
        { text: "Разъединить", action: () => splitCell(quillInstance) },
    ];

    buttons.forEach(({ text, action }) => menu.appendChild(createButton(text, action)));
};

const mergeCells = (direction, quillInstance) => {
    const activeCell = getActiveCell();
    if (!activeCell) return;

    let targetCell;
    if (direction === "down") {
        let nextRow = activeCell.parentElement?.nextElementSibling;
        while (nextRow) {
            targetCell = nextRow.cells[activeCell.cellIndex];
            if (targetCell && targetCell.style.display !== "none") break;
            nextRow = nextRow.nextElementSibling;
        }
    } else {
        targetCell = activeCell.nextElementSibling;
        while (targetCell && targetCell.style.display === "none") {
            targetCell = targetCell.nextElementSibling;
        }
    }

    if (!targetCell || targetCell.style.display === "none") return;

    let activeColspan = activeCell.colSpan || 1;
    let activeRowspan = activeCell.rowSpan || 1;
    let targetColspan = targetCell.colSpan || 1;
    let targetRowspan = targetCell.rowSpan || 1;

    if (direction === "down") {
        activeCell.rowSpan = activeRowspan + targetRowspan;
    } else {
        activeCell.colSpan = activeColspan + targetColspan;
    }

    targetCell.style.display = "none";
    targetCell.dataset.merged = "true";

    sendDataToMaximo(quillInstance.root.innerHTML);
};

const splitCell = (quillInstance) => {
    const activeCell = getActiveCell();
    if (!activeCell) return;

    const colSpan = activeCell.colSpan || 1;
    const rowSpan = activeCell.rowSpan || 1;

    if (colSpan === 1 && rowSpan === 1) return;

    let rowIndex = activeCell.parentElement.rowIndex;
    let colIndex = activeCell.cellIndex;

    for (let i = 0; i < rowSpan; i++) {
        let row = activeCell.parentElement.parentElement.rows[rowIndex + i];
        for (let j = 0; j < colSpan; j++) {
            let cell = row.cells[colIndex + j];
            if (cell && cell.dataset.merged) {
                cell.style.display = "";
                delete cell.dataset.merged;
            }
        }
    }

    activeCell.colSpan = 1;
    activeCell.rowSpan = 1;

    sendDataToMaximo(quillInstance.root.innerHTML);
};

const createButton = (text, action) => {
    const button = document.createElement("div");
    button.textContent = text;
    button.classList.add("menu-item");
    button.addEventListener("click", action);
    return button;
};

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
