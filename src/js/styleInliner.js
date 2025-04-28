export const inlineStyles = (quillRoot) => {
  // Получаем редактор
  const editor = quillRoot.querySelector(".ql-editor");
  if (!editor) return "";
  
  // Сохраняем оригинальный контент редактора для нативного представления
  const originalContent = editor.innerHTML;
  
  // Клонируем содержимое редактора, чтобы не менять оригинал
  const clone = editor.cloneNode(true);
  
  const fontMapping = {
    "arial": "Arial, Helvetica, sans-serif",
    "times-new-roman": "\"Times New Roman\", Times, serif",
    "courier-new": "\"Courier New\", Courier, monospace",
    "pt-mono": "\"PT Mono\", monospace"
  };
  
  // Этап 1: Обходим все элементы и заменяем классы на inline-стили или data-атрибуты
  clone.querySelectorAll("*").forEach(el => {
    const classes = Array.from(el.classList);
    classes.forEach(cls => {
      if (cls.startsWith("ql-font-")) {
        const fontKey = cls.substring("ql-font-".length);
        if (fontMapping[fontKey]) { 
          el.style.fontFamily = fontMapping[fontKey]; 
        }
        el.classList.remove(cls);
      }
      if (cls.startsWith("ql-align-")) {
        const align = cls.substring("ql-align-".length);
        el.style.textAlign = align;
        el.classList.remove(cls);
      }
      if (cls.startsWith("ql-indent-")) {
        const level = parseInt(cls.split("-")[2], 10) || 0;
        el.setAttribute("data-indent", level);
        el.classList.remove(cls);
      }
      if (cls === "ql-ui") {
        el.style.display = "none";
        el.classList.remove(cls);
      }
    });
    if (el.tagName === "LI" && el.hasAttribute("data-list") && !el.hasAttribute("data-indent")) {
      el.setAttribute("data-indent", "0");
    }
  });
  
  // Этап 2: Устанавливаем дефолтный шрифт для всех элементов, если inline-шрифт не задан
  const defaultFontKey =
    document.querySelector(".ql-font option[selected]")?.value || "arial";
  const defaultFontFamily =
    fontMapping[defaultFontKey] || "Arial, Helvetica, sans-serif";
  clone.querySelectorAll("*").forEach(el => {
    if (!el.style.fontFamily || el.style.fontFamily.trim() === "") {
      el.style.fontFamily = defaultFontFamily;
    }
  });
  
  // Этап 3: Удаляем служебные атрибуты и пустые class'ы
  clone.querySelectorAll("[data-row]").forEach(el => el.removeAttribute("data-row"));
  clone.querySelectorAll("*").forEach(el => {
    if (el.hasAttribute("class") && !el.className.trim()) {
      el.removeAttribute("class");
    }
  });
  
  // Этап 4: Применяем inline-стили для таблиц
  clone.querySelectorAll("table").forEach(table => {
    table.style.width = "100%";
    table.style.borderCollapse = "collapse";
    table.style.tableLayout = "fixed";
    // if (!table.style.border) {
    //   table.style.border = "1px solid #000";
    // }
  });
  clone.querySelectorAll("td, th").forEach(cell => {
    if (!cell.style.border) {
      cell.style.border = "1px solid #000";
    }
    cell.style.wordWrap = "break-word";
    cell.style.padding = "2px 5px";
  });
  
  // Этап 5: Применяем inline-отступы для элементов с data-indent
  clone.querySelectorAll("[data-indent]").forEach(el => {
    const level = parseInt(el.getAttribute("data-indent"), 10) || 0;
    el.style.paddingLeft = `${level * 39}px`;
  });
  
  // Этап 6: Удаляем служебные теги, например невидимые span
  clone.querySelectorAll("span[contenteditable='false']").forEach(el => el.remove());
  
  // Этап 7: Преобразуем списки (ordered и bullet)
  transformLists(clone);
  
  

  clone.querySelectorAll("li[data-list]").forEach(li => {
    const firstChild = Array.from(li.children).find(ch =>
      ch.style && (ch.style.fontSize || ch.style.color || ch.style.fontFamily)
    );
    if (firstChild) {
      if (firstChild.style.fontSize)   li.style.fontSize   = firstChild.style.fontSize;
      if (firstChild.style.color)      li.style.color      = firstChild.style.color;
      if (firstChild.style.fontFamily) li.style.fontFamily = firstChild.style.fontFamily;
    }
  });

  // Этап 8: Удаляем оставшиеся data-indent атрибуты
  clone.querySelectorAll("[data-indent]").forEach(el => el.removeAttribute("data-indent"));
  
  // Возвращаем комбинированный контент:
  // - Блок для BIRT с инлайн-стилями (inlineContent) 
  // - Блок для Quill с оригинальной разметкой (originalContent)
  const inlineContent = clone.innerHTML;
  return `<!--BIRT_START--><div style="text-indent:0">${inlineContent}</div><!--BIRT_END--><!--QUILL_START--><div style="display:none">${originalContent}</div><!--QUILL_END-->`;
};

function transformLists(root) {
  handleList(root, "ordered");
  handleList(root, "bullet");
}

function handleList(root, listType) {
  const lis = Array.from(root.querySelectorAll(`li[data-list='${listType}']`))
    .filter(li => !li.closest("table"));
  if (!lis.length) return;
  const isOrdered = listType === "ordered";
  const newList = document.createElement(isOrdered ? "ol" : "ul");
  const stack = [{ level: 0, list: newList }];
  
  const getIndent = li => {
    const indent = li.getAttribute("data-indent");
    return indent ? parseInt(indent, 10) : 0;
  };
  
  lis.forEach(li => {
    const level = getIndent(li);
    if (level > stack[stack.length - 1].level) {
      const nestedList = document.createElement(isOrdered ? "ol" : "ul");
      if (isOrdered) {
        const types = ["1", "a", "i", "A", "I"];
        const t = types[level % types.length];
        if (t !== "1") nestedList.setAttribute("type", t);
      }
      const parentLi = stack[stack.length - 1].list.lastElementChild;
      if (parentLi) {
        parentLi.appendChild(nestedList);
        stack.push({ level, list: nestedList });
        stack[stack.length - 1].list.appendChild(li);
      } else {
        stack[stack.length - 1].list.appendChild(li);
      }
    } else if (level < stack[stack.length - 1].level) {
      while (stack.length > 0 && level < stack[stack.length - 1].level) {
        stack.pop();
      }
      stack[stack.length - 1].list.appendChild(li);
    } else {
      stack[stack.length - 1].list.appendChild(li);
    }
  });
  
  const origList = findClosestList(lis[0]);
  if (origList && origList.parentNode) {
    origList.parentNode.replaceChild(newList, origList);
  } else {
    root.appendChild(newList);
  }
}

function findClosestList(el) {
  while (el && el.tagName !== "OL" && el.tagName !== "UL") {
    el = el.parentElement;
  }
  return el;
}

export const applyChildStylesToListItems = (rootElement) => {
  rootElement.querySelectorAll("li[data-list]").forEach(li => {
    const firstChild = Array.from(li.children).find(ch =>
      ch.style && (ch.style.fontSize || ch.style.color || ch.style.fontFamily)
    );
    if (firstChild) {
      if (firstChild.style.fontSize)   li.style.fontSize   = firstChild.style.fontSize;
      if (firstChild.style.color)      li.style.color      = firstChild.style.color;
    }
  });
}