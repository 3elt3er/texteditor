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

export const insertShape = (type) => {
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

export const sendDataToMaximo = () => {
    const editorContent = quill.root.innerHTML
    window.parent.postMessage({ action: "updateDescription", content: editorContent }, "*");
}