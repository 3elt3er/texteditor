export const sendDataToMaximo = (editorContent) => {
    window.parent.postMessage({ action: "updateDescription", content: editorContent }, "*");
    console.log(editorContent)
};
