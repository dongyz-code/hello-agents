// 前端应用逻辑

document.addEventListener("DOMContentLoaded", () => {
  // 元素引用
  const fileInput = document.getElementById("fileInput");
  const uploadBtn = document.getElementById("uploadBtn");
  const uploadStatus = document.getElementById("uploadStatus");
  const questionInput = document.getElementById("questionInput");
  const askBtn = document.getElementById("askBtn");
  const chatHistory = document.getElementById("chatHistory");
  const noteInput = document.getElementById("noteInput");
  const addNoteBtn = document.getElementById("addNoteBtn");
  const memoryList = document.getElementById("memoryList");
  const showMemoryBtn = document.getElementById("showMemoryBtn");
  const statsDisplay = document.getElementById("statsDisplay");
  const refreshStatsBtn = document.getElementById("refreshStatsBtn");

  // 上传文档
  uploadBtn.addEventListener("click", async () => {
    const file = fileInput.files[0];
    if (!file) {
      uploadStatus.textContent = "请先选择文件";
      return;
    }

    uploadStatus.textContent = "正在处理...";

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        uploadStatus.textContent = `✅ ${result.message}`;
      } else {
        uploadStatus.textContent = `❌ ${result.message}`;
      }

      refreshStats();
    } catch (error) {
      uploadStatus.textContent = `❌ 上传失败: ${error}`;
    }
  });

  // 问答
  askBtn.addEventListener("click", async () => {
    const question = questionInput.value.trim();
    if (!question) return;

    // 显示用户问题
    addMessage("user", question);
    questionInput.value = "";

    // 创建回答容器
    const answerDiv = addMessage("assistant", "正在思考...");

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });

      // 处理 SSE 流式响应
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullAnswer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = JSON.parse(line.slice(6));
            if (data.text) {
              fullAnswer += data.text;
              answerDiv.textContent = fullAnswer;
            }
            if (data.done && data.contexts) {
              // 显示参考来源
              const sourcesDiv = document.createElement("div");
              sourcesDiv.className = "sources";
              sourcesDiv.innerHTML = `<strong>参考来源:</strong><br>${data.contexts
                .map(
                  (c) =>
                    `相似度: ${c.score.toFixed(2)} - ${c.content.slice(0, 100)}...`
                )
                .join("<br>")}`;
              answerDiv.parentElement.appendChild(sourcesDiv);
            }
          }
        }
      }

      refreshStats();
    } catch (error) {
      answerDiv.textContent = `回答失败: ${error}`;
    }
  });

  // 添加消息到聊天历史
  function addMessage(role, content) {
    const messageDiv = document.createElement("div");
    messageDiv.className = `message ${role}`;

    const contentDiv = document.createElement("div");
    contentDiv.className = "message-content";
    contentDiv.textContent = content;

    messageDiv.appendChild(contentDiv);
    chatHistory.appendChild(messageDiv);

    return contentDiv;
  }

  // 添加笔记
  addNoteBtn.addEventListener("click", async () => {
    const content = noteInput.value.trim();
    if (!content) return;

    try {
      const response = await fetch("/api/memory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add",
          content,
          type: "semantic",
          importance: 0.8,
        }),
      });

      const result = await response.json();
      if (result.success) {
        noteInput.value = "";
        refreshStats();
      }
    } catch (error) {
      console.error("添加笔记失败:", error);
    }
  });

  // 查看记忆
  showMemoryBtn.addEventListener("click", async () => {
    try {
      const response = await fetch("/api/memory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "list" }),
      });

      const result = await response.json();
      if (result.success) {
        memoryList.innerHTML = result.data
          .map(
            (m) =>
              `<div class="memory-item">
                <span class="type">${m.type}</span>
                <span class="content">${m.content}</span>
                <span class="time">${new Date(m.timestamp).toLocaleString()}</span>
              </div>`
          )
          .join("");
      }
    } catch (error) {
      console.error("获取记忆失败:", error);
    }
  });

  // 刷新统计
  async function refreshStats() {
    try {
      const response = await fetch("/api/stats");
      const stats = await response.json();

      const duration = Math.floor((Date.now() - stats.sessionStart) / 1000);
      const minutes = Math.floor(duration / 60);
      const seconds = duration % 60;

      statsDisplay.innerHTML = `
        <p>会话时长: ${minutes}分${seconds}秒</p>
        <p>加载文档: ${stats.documentsLoaded}</p>
        <p>提问次数: ${stats.questionsAsked}</p>
        <p>学习笔记: ${stats.notesCount}</p>
        <p>向量数量: ${stats.vectorsCount || 0}</p>
      `;
    } catch (error) {
      console.error("获取统计失败:", error);
    }
  }

  refreshStatsBtn.addEventListener("click", refreshStats);

  // 初始加载统计
  refreshStats();
});