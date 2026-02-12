import { inlineStyles } from "./styleInliner.js";

export const sendDataToMaximo = () => {
  const root = document.querySelector("#editor");
  const { quillHtml, printHtml } = inlineStyles(root);

  window.parent.postMessage(
    {
      action: "updateDescription",
      quill: quillHtml,
      print: printHtml
    },
    "*"
  );
};
