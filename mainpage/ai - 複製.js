document.addEventListener("DOMContentLoaded", function() {
document.getElementById("send").addEventListener("click", sendMessage);

function showTyping() {
    const box = document.getElementById("chatbox");
    const typingDiv = document.createElement("div");
    typingDiv.className = "bubble ai typing";
    typingDiv.id = "typing-indicator";
    typingDiv.textContent = "AI 正在輸入";
    box.appendChild(typingDiv);
    box.scrollTop = box.scrollHeight;

    // 動態 ... 動畫
    let dots = 0;
    typingDiv._interval = setInterval(() => {
        dots = (dots + 1) % 4;
        typingDiv.textContent = "AI 正在輸入" + ".".repeat(dots);
    }, 400);
}

function hideTyping() {
    const typingDiv = document.getElementById("typing-indicator");
    if (typingDiv) {
        clearInterval(typingDiv._interval);
        typingDiv.remove();
    }
}

function parseMarkdown(text) {
    // 依序處理 markdown
    let html = text;

    // 標題 ##
    html = html.replace(/^## (.*$)/gim, '<h3>$1</h3>');

    // 粗體 **
    html = html.replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>');

    // 斜體 *
    html = html.replace(/\*(.*?)\*/gim, '<em>$1</em>');

    // bullet point → <ul><li>
    if (html.includes("* ")) {
        html = html.replace(/^\* (.*$)/gim, '<li>$1</li>');
        html = "<ul>" + html + "</ul>";
    }

    // 換行 → <br>
    html = html.replace(/\n/g, "<br>");

    return html.trim();
}

// 處理 一個一個字逐步打出來的動畫
async function typeText(element, text, speed = 12) {
    element.innerHTML = ""; // 開始時清空

    let i = 0;
    function type() {
        if (i < text.length) {

            // 支援 HTML 標籤（例如 <br>）不被切開
            if (text.substring(i, i + 4) === "<br>") {
                element.innerHTML += "<br>";
                i += 4;
            } else {
                element.innerHTML += text[i];
                i++;
            }

            setTimeout(type, speed);
        }
    }
    type();
}

function appendMessage(role, text) {
    const box = document.getElementById("chatbox");
    const div = document.createElement("div");
    div.className = role === "user" ? "bubble user" : "bubble ai";

    // 先放一個空的 div，等等逐字印字
    if (role === "ai") {
        box.appendChild(div);

        // 使用 Markdown parser
        const parsed = parseMarkdown(text);

        // 用逐字動畫
        typeText(div, parsed, 10);

    } else {
        // 使用者訊息：直接顯示
        div.innerHTML = parseMarkdown(text);
        box.appendChild(div);
    }

    box.scrollTop = box.scrollHeight;
}

function sendMessage() {
    console.log("Button clicked, sendMessage() triggered.");
    const prompt = document.getElementById("prompt").value;
    if (!prompt.trim()) return;

    appendMessage("user", prompt);
    document.getElementById("prompt").value = "";

     // ⭐ 顯示 AI typing 動畫
    showTyping();

    fetch("mainpage/ai.php", {
        method: "POST",
        body: new URLSearchParams({ prompt: prompt }),
        headers: { "Content-Type": "application/x-www-form-urlencoded" }
    })
    .then(r => r.text())
    .then(response => {
        hideTyping(); // ⭐ 移除動畫
        appendMessage("ai", response);
    })
    .catch(err => {
        appendMessage("ai", "⚠️ 錯誤：" + err);
    });
}

});
