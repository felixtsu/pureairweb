import { NextRequest, NextResponse } from "next/server";

const COZE_API_VERSION = "v3";

function getCozeApiBase(): string {
  return process.env.COZE_API_BASE ?? "https://api.coze.com";
}

export interface CozeChatRequestBody {
  message: string;
  conversationId?: string;
  userId?: string;
}

export interface CozeChatResponseBody {
  reply: string;
  conversationId: string;
}

interface SSEMessage {
  event: string;
  data: string;
}

interface ChatData {
  id: string;
  conversation_id: string;
  bot_id: string;
  created_at?: number;
  completed_at?: number;
  status?: string;
}

interface MessageData {
  id: string;
  role: string;
  type: string;
  content: string;
  content_type: string;
  chat_id: string;
  conversation_id: string;
  bot_id: string;
}

/**
 * 解析 SSE 響應流
 */
async function parseSSEStream(reader: ReadableStreamDefaultReader<Uint8Array>): Promise<SSEMessage[]> {
  const decoder = new TextDecoder();
  const messages: SSEMessage[] = [];
  let buffer = "";
  let currentEvent = "";
  let currentData = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || ""; // 保留最後不完整的行

      for (const line of lines) {
        const trimmedLine = line.trim();
        
        if (trimmedLine.startsWith("event:")) {
          // 如果之前有累積的數據，先保存
          if (currentEvent && currentData) {
            messages.push({ event: currentEvent, data: currentData });
            currentData = "";
          }
          currentEvent = trimmedLine.substring(6).trim();
        } else if (trimmedLine.startsWith("data:")) {
          const dataContent = trimmedLine.substring(5).trim();
          // 累積多行 data（SSE 規範允許）
          if (currentData) {
            currentData += "\n" + dataContent;
          } else {
            currentData = dataContent;
          }
        } else if (trimmedLine === "") {
          // 空行表示一個完整的 SSE 消息結束
          if (currentEvent && currentData) {
            messages.push({ event: currentEvent, data: currentData });
            currentEvent = "";
            currentData = "";
          }
        }
      }
    }

    // 處理最後的緩衝數據
    if (buffer.trim()) {
      const lines = buffer.split("\n");
      for (const line of lines) {
        const trimmedLine = line.trim();
        if (trimmedLine.startsWith("event:")) {
          if (currentEvent && currentData) {
            messages.push({ event: currentEvent, data: currentData });
            currentData = "";
          }
          currentEvent = trimmedLine.substring(6).trim();
        } else if (trimmedLine.startsWith("data:")) {
          const dataContent = trimmedLine.substring(5).trim();
          if (currentData) {
            currentData += "\n" + dataContent;
          } else {
            currentData = dataContent;
          }
        }
      }
    }

    // 處理最後一個消息
    if (currentEvent && currentData) {
      messages.push({ event: currentEvent, data: currentData });
    }
  } catch (error) {
    throw error;
  }

  return messages;
}

/**
 * 處理 Coze API 的 SSE 流式響應
 */
async function processStreamingResponse(
  response: Response
): Promise<{ conversationId: string; reply: string }> {
  if (!response.body) {
    throw new Error("Response body is null");
  }

  const reader = response.body.getReader();
  const messages = await parseSSEStream(reader);

  let conversationId = "";
  let chatId = "";
  const answerContents: Map<string, string> = new Map(); // messageId -> accumulated content
  let finalReply = "";

  for (const sseMsg of messages) {
    try {
      // 處理 [DONE] 標記
      if (sseMsg.data.trim() === "[DONE]") {
        break;
      }

      // 跳過空數據
      if (!sseMsg.data.trim()) {
        continue;
      }

      const data = JSON.parse(sseMsg.data);

      switch (sseMsg.event) {
        case "conversation.chat.created":
          const chatData = data as ChatData;
          conversationId = chatData.conversation_id || conversationId;
          chatId = chatData.id || chatId;
          break;

        case "conversation.chat.in_progress":
          // 更新 conversation_id 如果還沒有設置
          if (data.conversation_id && !conversationId) {
            conversationId = data.conversation_id;
          }
          break;

        case "conversation.message.delta":
          const deltaMsg = data as MessageData;
          if (deltaMsg.type === "answer" && deltaMsg.role === "assistant") {
            const currentContent = answerContents.get(deltaMsg.id) || "";
            answerContents.set(deltaMsg.id, currentContent + (deltaMsg.content || ""));
          }
          break;

        case "conversation.message.completed":
          const completedMsg = data as MessageData;
          if (completedMsg.type === "answer" && completedMsg.role === "assistant") {
            // 使用 completed 事件中的完整內容（這是所有 delta 的累積結果）
            const fullContent = completedMsg.content || answerContents.get(completedMsg.id) || "";
            if (fullContent) {
              // 如果有多個 answer，累積它們
              finalReply += (finalReply ? "\n\n" : "") + fullContent;
            }
          }
          break;

        case "conversation.chat.completed":
          // 確保 conversation_id 已設置
          if (data.conversation_id && !conversationId) {
            conversationId = data.conversation_id;
          }
          break;

        case "conversation.chat.failed":
          throw new Error(`Chat failed: ${data.msg || JSON.stringify(data)}`);

        case "error":
          throw new Error(`SSE error: ${data.msg || JSON.stringify(data)}`);

        case "done":
          break;
      }
    } catch (error) {
      // 如果是 JSON 解析錯誤，可能是 [DONE] 或其他非 JSON 數據
      if (error instanceof SyntaxError && sseMsg.data.trim() === "[DONE]") {
        break;
      }
      // 繼續處理其他消息，不中斷
    }
  }

  if (!conversationId) {
    throw new Error("無法從 SSE 流中獲取 conversation_id");
  }

  if (!finalReply) {
    // 如果沒有從 completed 事件獲取到內容，嘗試從 delta 累積的內容中獲取
    const accumulatedContent = Array.from(answerContents.values()).join("\n\n");
    if (accumulatedContent) {
      finalReply = accumulatedContent;
    } else {
      throw new Error("無法從 SSE 流中獲取回覆內容");
    }
  }

  return { conversationId, reply: finalReply };
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.COZE_API_KEY;
  const botId = process.env.COZE_BOT_ID;

  if (!apiKey || !botId) {
    return NextResponse.json(
      {
        error: "Coze API 未配置",
        detail: `請設置 COZE_API_KEY 與 COZE_BOT_ID 環境變量。當前: apiKey=${!!apiKey}, botId=${!!botId}`,
      },
      { status: 503 }
    );
  }

  // 確保 botId 是字串格式
  const botIdStr = String(botId).trim();
  if (!botIdStr || botIdStr === "0") {
    return NextResponse.json(
      {
        error: "Coze Bot ID 無效",
        detail: `Bot ID 不能為空或 0。當前值: "${botId}"`,
      },
      { status: 503 }
    );
  }

  let body: CozeChatRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "無效的 JSON 請求體" },
      { status: 400 }
    );
  }

  const { message, conversationId, userId } = body;
  if (!message || typeof message !== "string") {
    return NextResponse.json(
      { error: "請提供 message 字串" },
      { status: 400 }
    );
  }

  const resolvedUserId = typeof userId === "string" && userId.trim()
    ? userId.trim()
    : "demo-user-a";

  try {
    const base = getCozeApiBase();
    
    // conversation_id 應該作為 query 參數，而不是 body 參數
    let requestUrl = `${base}/${COZE_API_VERSION}/chat`;
    if (conversationId && conversationId.trim()) {
      requestUrl += `?conversation_id=${encodeURIComponent(conversationId.trim())}`;
    }
    
    // 構建請求 body，按照 Coze API v3 規範
    // 用戶訊息應該放在 additional_messages 陣列中
    // 使用 streaming 模式（SSE）
    const requestBody: Record<string, any> = {
      bot_id: botIdStr,
      user_id: resolvedUserId,
      custom_variables: { userId: resolvedUserId },
      additional_messages: [
        {
          role: "user",
          type: "question",
          content: message,
          content_type: "text",
        },
      ],
      stream: true, // 啟用 SSE streaming 模式
    };

    const createRes = await fetch(requestUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!createRes.ok) {
      const errText = await createRes.text();
      return NextResponse.json(
        {
          error: "Coze 服務暫時無法回應",
          detail: createRes.status === 401 ? "API 密鑰無效" : errText.slice(0, 200),
        },
        { status: 502 }
      );
    }

    // 處理 SSE 流式響應
    const { conversationId: newConversationId, reply } = await processStreamingResponse(createRes);

    return NextResponse.json({
      reply,
      conversationId: newConversationId,
    } satisfies CozeChatResponseBody);
  } catch (err) {
    return NextResponse.json(
      {
        error: "請求 Coze 時發生錯誤",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}
