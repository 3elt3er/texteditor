import { sendDataToMaximo } from "./maximo.js";
import { activeCell } from "./main.js";

export const setupDropDownLocalization = () => {
    const translations = {
        "Insert Row": "Вставить строку ниже",
        "Insert Column": "Вставить колонку справа",
        "Delete Row": "Удалить строку",
        "Delete Column": "Удалить колонку",
        "Delete Table": "Удалить таблицу"
    };

    document.querySelectorAll(".wi-menu div").forEach((el) => {
        el.innerHTML = translations[el.innerHTML] || el.innerHTML;
        el.addEventListener("click", () => {
            updateTableBorders()
        })
    });
};

export const setupTableFunctions = (quillInstance) => {
    const menu = document.querySelector(".wi-menu");

    const increaseButton = createButton("Увеличить толщину рамок", () => changeBorderWidth(1, quillInstance));
    const decreaseButton = createButton("Уменьшить толщину рамок", () => changeBorderWidth(-1, quillInstance));

    const mergeDownButton = createButton("Объединить с нижней", () => mergeWithBottom(quillInstance));
    const mergeRightButton = createButton("Объединить с правой", () => mergeWithRight(quillInstance));

    menu.appendChild(increaseButton);
    menu.appendChild(decreaseButton);
    menu.appendChild(mergeDownButton);
    menu.appendChild(mergeRightButton);
};

const mergeWithBottom = (quillInstance) => {
    if (!activeCell) return;

    let row = activeCell.parentElement;
    let nextRow = row.nextElementSibling;
    if (!nextRow) return; // Нет нижней строки

    let bottomCell = nextRow.cells[activeCell.cellIndex];
    if (!bottomCell) return;

    activeCell.rowSpan = (activeCell.rowSpan || 1) + (bottomCell.rowSpan || 1);
    bottomCell.style.display = "none"; // Скрываем нижнюю ячейку

    sendDataToMaximo(quillInstance.root.innerHTML);
};

const mergeWithRight = (quillInstance) => {
    if (!activeCell) return;

    let rightCell = activeCell.nextElementSibling;
    if (!rightCell) return; // Нет правой ячейки

    activeCell.colSpan = (activeCell.colSpan || 1) + (rightCell.colSpan || 1);
    rightCell.style.display = "none"; // Скрываем правую ячейку
    sendDataToMaximo(quillInstance.root.innerHTML);
};


// Функция создания кнопки
const createButton = (text, action) => {
    const button = document.createElement("div");
    button.innerText = text;
    button.classList.add("menu-item");
    button.addEventListener("click", action);
    return button;
};

// Глобальное хранилище для толщины рамки
let borderWidth = 1;

const changeBorderWidth = (arg, quillInstance) => {
    switch (arg) {
        case 1:
            if (borderWidth < 10) {
                borderWidth++;
            }
            break;
        case -1:
            if (borderWidth > 0) {
                borderWidth--;
            } 
            break;
    }
    updateTableBorders();
    sendDataToMaximo(quillInstance.root.innerHTML);
}


const updateTableBorders = () => {
    document.querySelectorAll("td, th").forEach((cell) => {
        cell.style.border = `${borderWidth}px solid black`;
    });
};


