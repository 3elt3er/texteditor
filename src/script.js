import {sendDataToMaximo} from './main.js'

let borderWidth = 1;

export const translateDropdowns = () => {
    const translations = {
        "Insert Row": "Вставить строку ниже",
        "Insert Column": "Вставить колонку справа",
        "Delete Row": "Удалить строку",
        "Delete Column": "Удалить колонку",
        "Delete Table": "Удалить таблицу"
    };

    document.querySelectorAll(".wi-menu div").forEach((el) => {
        el.innerHTML = translations[el.innerHTML];
    })
}

export const addThicknessButtons = () => {
    const menu = document.querySelector(".wi-menu");

    const increaseButton = document.createElement("div");
    increaseButton.innerText = "Увеличить толщину рамок";
    increaseButton.classList.add("menu-item");
    increaseButton.addEventListener("click", () => increaseBorder());

    const decreaseButton = document.createElement("div");
    decreaseButton.innerText = "Уменьшить толщину рамок";
    decreaseButton.classList.add("menu-item");
    decreaseButton.addEventListener("click", () => decreaseBorder());

    menu.appendChild(increaseButton);
    menu.appendChild(decreaseButton);
}

const increaseBorder = () => {
    if (borderWidth < 10) {
        borderWidth++;
        updateTableBorders();
        sendDataToMaximo();
    }
};

const decreaseBorder = () => {
    if (borderWidth > 0) {
        borderWidth--;
        updateTableBorders();
        sendDataToMaximo();
    }
};

const updateTableBorders = () => {
    document.querySelectorAll('td, th').forEach(cell => {
        cell.style.border = `${borderWidth}px solid black`;
    });
};
