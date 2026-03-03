import { inlineStyles } from "./styleInliner.js";

export const sendDataToMaximo = () => {
  const root = document.querySelector("#editor");
  const { quillHtml, printHtml } = inlineStyles(root);
  const payload = {
    action: "updateDescription",
    quill: quillHtml,
    print: printHtml
  };

  window.parent.postMessage(
    payload,
    "*"
  );
};
