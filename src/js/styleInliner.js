export const inlineStyles = (quillRoot) => {
    const editor = quillRoot.querySelector(".ql-editor");
    if (!editor) return "";
  
    // Клонируем содержимое редактора, чтобы не менять оригинальный DOM
    const clone = editor.cloneNode(true);
  
    const fontMapping = {
      "arial": "Arial, Helvetica, sans-serif",
      "times-new-roman": "\"Times New Roman\", Times, serif",
      "courier-new": "\"Courier New\", Courier, monospace",
      "pt-mono": "\"PT Mono\", monospace"
    };
  
    // Обходим все элементы и заменяем классы на inline стили / data-атрибуты
    clone.querySelectorAll("*").forEach((el) => {
      const classes = Array.from(el.classList);
      classes.forEach((cls) => {
        // Обработка шрифтов
        if (cls.startsWith("ql-font-")) {
          const fontKey = cls.substring("ql-font-".length);
          if (fontMapping[fontKey]) {
            el.style.fontFamily = fontMapping[fontKey];
          }
          el.classList.remove(cls);
        }
        // Выравнивание
        if (cls.startsWith("ql-align-")) {
          const align = cls.substring("ql-align-".length);
          el.style.textAlign = align;
          el.classList.remove(cls);
        }
        // Обработка отступов для списков: сохраняем уровень в data-indent
        if (cls.startsWith("ql-indent-")) {
          const level = parseInt(cls.split("-")[2], 10) || 0;
          el.setAttribute("data-indent", level);
          el.classList.remove(cls);
        }
        // Служебные классы
        if (cls === "ql-ui") {
          el.style.display = "none";
          el.classList.remove(cls);
        }
      });
      // Если элемент – LI с data-list и нет data-indent, устанавливаем его в 0
      if (el.tagName === "LI" && el.hasAttribute("data-list") && !el.hasAttribute("data-indent")) {
        el.setAttribute("data-indent", "0");
      }
    });

    // Получаем значение шрифта по умолчанию из селектора, если выбран, иначе "arial"
    const defaultFontKey = document.querySelector(".ql-font option[selected]")?.value || "arial";
    const defaultFontFamily = fontMapping[defaultFontKey] || "Arial, Helvetica, sans-serif";

    // Проходим по всем элементам и задаём default‑шрифт, если он не установлен inline
    clone.querySelectorAll("*").forEach((el) => {
    if (!el.style.fontFamily || el.style.fontFamily.trim() === "") {
        el.style.fontFamily = defaultFontFamily;
    }
    });

    // 1) Удаляем служебные атрибуты
    clone.querySelectorAll("[data-row]").forEach((el) => {
        el.removeAttribute("data-row");
    });
    
    // 2) Удаляем пустые class=""
    clone.querySelectorAll("*").forEach((el) => {
        if (el.hasAttribute("class") && !el.className.trim()) {
        el.removeAttribute("class");
        }
    });
    
    // 3) Добавляем inline-стили для таблиц
    clone.querySelectorAll("table").forEach((table) => {
        table.style.width = "100%";
        table.style.borderCollapse = "collapse";
        table.style.tableLayout = "fixed";
        if(!table.style.border) {
            table.style.border = "1px solid #000"; 
        }
    });
    
    clone.querySelectorAll("td, th").forEach((cell) => {
        if(!cell.style.border) {
            cell.style.border = "1px solid #000";
        }
        cell.style.wordWrap = "break-word";
        cell.style.padding = "2px 5px";
    });
  
    // Преобразуем списки, используя data-indent для создания вложенности
    transformLists(clone);
  
    return clone.innerHTML;
  };
  
  function transformLists(root) {
    // Обрабатываем сначала нумерованные, потом маркированные списки
    handleList(root, "ordered");
    handleList(root, "bullet");
  }
  
  function handleList(root, listType) {
    const lis = Array.from(root.querySelectorAll(`li[data-list='${listType}']`));
    if (!lis.length) return;
  
    const isOrdered = listType === "ordered";
    // Создаем новый список: <ol> для ordered и <ul> для bullet
    const newList = document.createElement(isOrdered ? "ol" : "ul");
  
    // Стек для отслеживания вложенности. Каждый элемент: { level, list }
    const stack = [{ level: 0, list: newList }];
  
    const getIndent = (li) => {
      const indent = li.getAttribute("data-indent");
      return indent ? parseInt(indent, 10) : 0;
    };
  
    lis.forEach((li) => {
      const level = getIndent(li);
  
      if (level > stack[stack.length - 1].level) {
        // Если уровень больше, создаём вложенный список
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
          // Если родительский LI отсутствует, добавляем LI в текущий список
          stack[stack.length - 1].list.appendChild(li);
        }
      } else if (level < stack[stack.length - 1].level) {
        // Если уровень уменьшился, выходим из стека до нужного уровня
        while (stack.length > 0 && level < stack[stack.length - 1].level) {
          stack.pop();
        }
        stack[stack.length - 1].list.appendChild(li);
      } else {
        // Если уровень равен, просто добавляем LI в текущий список
        stack[stack.length - 1].list.appendChild(li);
      }
    });
  
    // Находим ближайший существующий список для первого LI, если есть
    const origList = findClosestList(lis[0]);
    if (origList && origList.parentNode) {
      origList.parentNode.replaceChild(newList, origList);
    } else {
      // Если оригинальный список не найден, просто добавляем новый список в root
      root.appendChild(newList);
    }
  }
  
  function findClosestList(el) {
    while (el && el.tagName !== "OL" && el.tagName !== "UL") {
      el = el.parentElement;
    }
    return el;
  }
  