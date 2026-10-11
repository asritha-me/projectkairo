import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ChatRequest {
  message: string;
  history?: Array<{ role: string; content: string }>;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");

    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    const { message, history = [] } = (await req.json()) as ChatRequest;

    if (!message || message.trim().length === 0) {
      return new Response(JSON.stringify({ error: "Message is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // RAG: Retrieve the user's medical documents for context
    const { data: documents } = await supabase
      .from("medical_documents")
      .select("id, title, document_type, ai_summary, extracted_text, report_date, source_organization, file_name")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20);

    // Retrieve lab results
    const { data: labResults } = await supabase
      .from("lab_results")
      .select("test_name, value, unit, reference_range, flag, report_date")
      .eq("user_id", userId)
      .order("report_date", { ascending: false })
      .limit(50);

    // Retrieve medications
    const { data: medications } = await supabase
      .from("medications")
      .select("medicine_name, dosage, frequency, duration, prescribing_clinician, prescription_date")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(30);

    // Build context from retrieved records
    let contextParts: string[] = [];

    if (documents && documents.length > 0) {
      contextParts.push("=== UPLOADED MEDICAL DOCUMENTS ===");
      for (const doc of documents) {
        const textPreview = doc.extracted_text
          ? doc.extracted_text.substring(0, 800)
          : "(no extracted text)";
        contextParts.push(
          `Document: ${doc.title} (${doc.document_type})\n` +
          `Date: ${doc.report_date || "unknown"}\n` +
          `Source: ${doc.source_organization || "unknown"}\n` +
          `Summary: ${doc.ai_summary || "N/A"}\n` +
          `Content excerpt: ${textPreview}\n`
        );
      }
    }

    if (labResults && labResults.length > 0) {
      contextParts.push("=== LABORATORY RESULTS ===");
      for (const lab of labResults) {
        contextParts.push(
          `${lab.test_name}: ${lab.value} ${lab.unit} (Reference: ${lab.reference_range || "not provided"}, Flag: ${lab.flag}) — Date: ${lab.report_date || "unknown"}`
        );
      }
    }

    if (medications && medications.length > 0) {
      contextParts.push("=== MEDICATIONS ===");
      for (const med of medications) {
        contextParts.push(
          `${med.medicine_name} — ${med.dosage}, ${med.frequency}, ${med.duration} (Prescribed by: ${med.prescribing_clinician || "unknown"}, Date: ${med.prescription_date || "unknown"})`
        );
      }
    }

    const context = contextParts.length > 0
      ? contextParts.join("\n\n")
      : "No medical records have been uploaded yet.";

    // Build conversation history
    const historyText = history
      .slice(-10)
      .map((h) => `${h.role === "user" ? "Patient" : "KAIRO"}: ${h.content}`)
      .join("\n");

    if (!geminiApiKey) {
      return new Response(
        JSON.stringify({
          reply: "I'm unable to process your question right now because the AI service (Gemini API key) has not been configured. Please ask your project administrator to add the GEMINI_API_KEY secret. In the meantime, you can still upload documents and view extracted information on the Medical Records page.",
          sources: [],
          configured: false,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const systemPrompt = `You are KAIRO, an AI-powered personal health copilot. You help patients understand their own medical records in simple language.

CRITICAL RULES:
- Answer ONLY based on the medical records provided in the context below.
- Do NOT invent or hallucinate medical information that is not in the records.
- If the information is not available in the records, say so clearly.
- Do NOT diagnose medical conditions.
- Do NOT recommend starting, stopping, or changing any medication.
- Always encourage the user to consult their clinician for medical advice.
- For urgent symptoms, advise the user to seek immediate medical attention or contact emergency services.
- Use clear, simple language that a non-medical person can understand.
- When referencing specific data, mention the source document name and date.
- Clearly distinguish between facts extracted from documents and your AI-generated interpretations.

PATIENT'S MEDICAL RECORDS:
${context}

PREVIOUS CONVERSATION:
${historyText || "(no previous conversation)"}

Respond helpfully and compassionately. Keep responses focused and well-structured. Use markdown for readability.`;

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: systemPrompt + "\n\nPatient question: " + message }] }],
          generationConfig: {
            temperature: 0.3,
            topP: 0.9,
            maxOutputTokens: 2048,
          },
        }),
      }
    );

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error("Gemini API error:", errorText);
      return new Response(
        JSON.stringify({
          reply: "I encountered an error while trying to process your question. Please try again in a moment.",
          sources: [],
          error: true,
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const geminiData = await geminiResponse.json();
    const replyText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || "I was unable to generate a response. Please try again.";

    // Build source references
    const sources: Array<{ documentName: string; date: string }> = [];
    if (documents) {
      for (const doc of documents) {
        sources.push({
          documentName: doc.title || doc.file_name,
          date: doc.report_date || "unknown",
        });
      }
    }

    return new Response(
      JSON.stringify({
        reply: replyText,
        sources,
        configured: true,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Chat edge function error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
