const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export default async function onRequest(context) {
  const { request, env } = context;

  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (request.method === "GET") {
    return json({ error: "Method not allowed. Please use POST." }, 405);
  }

  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  if (!env.DEEPSEEK_API_KEY) {
    return json({ error: "Missing DEEPSEEK_API_KEY" }, 500);
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const response = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: env.DEEPSEEK_MODEL || "deepseek-v4-flash",
      messages: [
        {
          role: "system",
          content: "你是中级会计《财务管理》备考教练。请只输出合法 JSON，不要输出 Markdown。",
        },
        { role: "user", content: buildPrompt(payload) },
      ],
      thinking: { type: "disabled" },
      response_format: { type: "json_object" },
      stream: false,
    }),
  });

  if (!response.ok) {
    const message = await response.text();
    return json({ error: "DeepSeek request failed", detail: message }, response.status);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) {
    return json({ error: "Empty model response" }, 502);
  }

  try {
    return json(JSON.parse(content));
  } catch {
    return json({ error: "Model response is not valid JSON", raw: content }, 502);
  }
}

function buildPrompt(payload) {
  return JSON.stringify(
    {
      task: "为一道中级会计财务管理单选题生成学习型解题说明和一道同类例题。",
      requirements: [
        "语言简洁，适合工作忙的备考者快速理解。",
        "不要改写原题答案。",
        "同类例题必须是单选题，必须有 A/B/C/D 四个选项。",
        "返回 JSON 字段必须完全匹配 schema。",
      ],
      schema: {
        knowledgePoint: "核心知识点，1-2 句话",
        solvingApproach: "解题思路，按步骤说明",
        commonMistake: "易错提醒，指出常见误区",
        example: {
          stem: "同类例题题干",
          options: { A: "选项A", B: "选项B", C: "选项C", D: "选项D" },
          answer: "A/B/C/D",
          explanation: "例题解析",
        },
      },
      input: payload,
    },
    null,
    2,
  );
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}
