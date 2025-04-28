1. В Maximo зайти в дизайнер программ "ТБП/БП/Программы переключений" - открыть Section с полем содержание - В поле "Описание" вставить:

<iframe id="frame1" name="frame" width="1000" height="400" src="http://localhost:3000" onload="var i=document.getElementById('frame1'),d=document.getElementById('m2f751f0a-ta');d.style.width=0;d.style.height=0;d.style.opacity=0;if(i&&i.contentWindow&&d){var m=d.value.trim(),q=(m.match(/<!--QUILL_START--><div[^>]*>([\s\S]*?)<\/div><!--QUILL_END-->/)||[])[1];if(q&&q!=='<p><br></p>'){i.contentWindow.postMessage({content:q},'*');console.log('[MAXIMO] Отправлено в iframe:',q);}}"></iframe><script>window.addEventListener("message",function(e){var t=document.getElementById("m2f751f0a-ta");if(t&&e.data&&typeof e.data.content==="string"&&t.value!==e.data.content){t.focus();document.execCommand("selectAll",false,null);document.execCommand("insertText",false,e.data.content);setTimeout(function(){var ev1=document.createEvent("HTMLEvents");ev1.initEvent("input",true,true);t.dispatchEvent(ev1);var ev2=document.createEvent("HTMLEvents");ev2.initEvent("change",true,true);t.dispatchEvent(ev2);var i=document.getElementById("frame1");if(i&&i.contentWindow){i.contentWindow.focus();setTimeout(function(){i.contentWindow.postMessage({action:"restoreFocus",content:e.data.content},"*");},50);}},100);}});</script>

2. Нажать на поле "Описание" - нажать на кнопку "Скрыть метку?" - ДА. 

3. Открыть конфигурирование базы данных - таблица REAOSUBJECT - атрибут DESCRIPTION - увеличить длину атрибута до 10.000 хотя бы.






