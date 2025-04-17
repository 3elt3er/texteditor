import { inlineStyles } from "./styleinliner";

export const sendDataToMaximo = () => {
  const combinedContent = inlineStyles(document.querySelector("#editor"));

  window.parent.postMessage(
    { action: "updateDescription", content: combinedContent },
    "*"
  );

  console.log("[IFRAME] Отправлено в Maximo:", combinedContent);
};