import { inlineStyles } from "./styleInliner.js";

export const sendDataToMaximo = () => {
  const root = document.querySelector("#editor");
  const { quillHtml, printHtml } = inlineStyles(root);
  const payload = {
    action: "updateDescription",
    quill: quillHtml,
    print: printHtml
  };

  console.log("[IFRAME->MAXIMO] payload:", payload);

  window.parent.postMessage(
    payload,
    "*"
  );
};
