import { inlineStyles } from "./styleinliner";

export const sendDataToMaximo = () => {
    const contentWithInline = inlineStyles(document.querySelector("#editor"));
    window.parent.postMessage(
        { action: "updateDescription", content: contentWithInline },
        "*"
    );
    console.log('[IFRAME] Отправлено в Maximo', contentWithInline );
};