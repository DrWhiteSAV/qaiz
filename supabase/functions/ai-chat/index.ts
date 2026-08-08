import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PROTALK_URL = "https://eu1.api.pro-talk.ru/api/v1.0/ask";

async function askProTalk(
  message: string,
  token: string,
  botId: number,
  chatId: string,
  socialId: string,
): Promise<string> {
  const url = `${PROTALK_URL}/${token}`;
  const body = {
    bot_id: botId,
    chat_id: chatId,
    message,
    social_id: socialId,
  };

  console.log(`ProTalk request: chat_id=${chatId}, message length=${message.length}`);

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("ProTalk API error:", response.status, errorText);
    throw new Error(`ProTalk API error: ${response.status}`);
  }

  const data = await response.json();
  return data.done || "";
}

// Extract JSON from response that might contain markdown code blocks
function extractJSON(text: string): string {
  // Try to find JSON in markdown code blocks
  const jsonBlockMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (jsonBlockMatch) {
    return jsonBlockMatch[1].trim();
  }
  
  // Try to find JSON array or object directly
  const arrayMatch = text.match(/\[[\s\S]*\]/);
  const objectMatch = text.match(/\{[\s\S]*\}/);
  
  if (arrayMatch && (!objectMatch || arrayMatch.index! <= objectMatch.index!)) {
    return arrayMatch[0];
  }
  if (objectMatch) {
    return objectMatch[0];
  }
  
  return text.trim();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, mode, userInfo } = await req.json();

    const PROTALK_BOT_TOKEN = Deno.env.get("PROTALK_BOT_TOKEN");
    const PROTALK_BOT_ID = Deno.env.get("PROTALK_BOT_ID");

    if (!PROTALK_BOT_TOKEN || !PROTALK_BOT_ID) {
      throw new Error("ProTalk credentials are not configured");
    }

    if (!prompt) {
      return new Response(JSON.stringify({ error: "prompt is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate unique chat_id per request to avoid context pollution between games
    const chatId = `qaiz_${mode || 'game'}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const socialId = userInfo?.uid 
      ? `from_user_id:${userInfo.uid} ${userInfo.display_name || 'Player'} message_id:${Date.now()}`
      : `from_user_id:unknown message_id:${Date.now()}`;

    console.log(`AI-Chat request: mode=${mode}, chat_id=${chatId}`);

    const systemPrefix = `Ты — AI-движок для генерации контента игр-викторин. Отвечай СТРОГО в формате JSON. Никаких пояснений, только JSON.\n\n`;
    const fullPrompt = systemPrefix + prompt;

    const aiResponse = await askProTalk(
      fullPrompt,
      PROTALK_BOT_TOKEN,
      parseInt(PROTALK_BOT_ID),
      chatId,
      socialId,
    );

    if (!aiResponse) {
      return new Response(JSON.stringify({ error: "Empty AI response" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Try to parse JSON from the response
    const jsonStr = extractJSON(aiResponse);
    let parsed: any;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      // Return raw text if not valid JSON (for comments, etc.)
      console.log("Response is not JSON, returning raw text");
      return new Response(JSON.stringify({ response: aiResponse, raw: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ response: parsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
