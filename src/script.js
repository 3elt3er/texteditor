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