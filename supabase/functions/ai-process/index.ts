import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ProcessRequest {
  documentId: string;
  extractedText: string;
  documentType: string;
  fileName: string;
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

    const body: ProcessRequest = await req.json();
    const { documentId, extractedText, documentType, fileName } = body;

    if (!extractedText || extractedText.trim().length < 10) {
      await supabase
        .from("medical_documents")
        .update({
          processing_status: "needs_review",
          error_message: "No readable text could be extracted from this document. Please try a clearer scan or a different file.",
        })
        .eq("id", documentId)
        .eq("user_id", userId);

      return new Response(
        JSON.stringify({ error: "Insufficient text extracted from document" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update status to processing
    await supabase
      .from("medical_documents")
      .update({ processing_status: "processing" })
      .eq("id", documentId)
      .eq("user_id", userId);

    if (!geminiApiKey) {
      // Save extracted text but mark as needs_review for AI
      await supabase
        .from("medical_documents")
        .update({
          processing_status: "text_extracted",
          extracted_text: extractedText,
          error_message: "Text extracted successfully. AI analysis requires GEMINI_API_KEY to be configured.",
        })
        .eq("id", documentId)
        .eq("user_id", userId);

      return new Response(
        JSON.stringify({
          warning: "GEMINI_API_KEY is not configured. Text was extracted but AI analysis was skipped.",
          extractedText,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const prompt = `You are KAIRO, an AI medical document analysis assistant. Analyze the following medical document text and extract structured information.

IMPORTANT RULES:
- Only extract information that is ACTUALLY present in the text. Do NOT invent or hallucinate any data.
- Preserve original values, units, dates, and wording exactly as written.
- If a field is not present in the document, omit it — do not make up values.
- Separate extracted facts from your AI-generated explanations.
- Do NOT diagnose conditions. Do NOT recommend medication changes.
- Encourage the user to consult their clinician for medical advice.

DOCUMENT TYPE: ${documentType}
FILE NAME: ${fileName}

DOCUMENT TEXT:
"""
${extractedText}
"""

Respond with ONLY a valid JSON object in this exact format:
{
  "documentType": "detected document type (lab_report, prescription, discharge_summary, doctor_note, medical_history, or other)",
  "reportDate": "YYYY-MM-DD if found, otherwise empty string",
  "sourceOrganization": "hospital/clinic/lab name if found, otherwise empty string",
  "summary": "2-3 sentence plain-language summary of what this document contains",
  "explanation": "A clear, simple-language explanation of the document contents for a non-medical user. Explain any medical terms. 2-4 paragraphs.",
  "labResults": [
    {
      "testName": "name of the test",
      "value": "the result value as written",
      "unit": "unit if provided",
      "referenceRange": "reference range if provided",
      "flag": "H if above range, L if below range, normal if within range or no range given"
    }
  ],
  "medications": [
    {
      "medicineName": "medicine name as written",
      "dosage": "dosage as written",
      "frequency": "frequency if stated",
      "duration": "duration if stated",
      "prescribingClinician": "doctor name if available"
    }
  ],
  "diagnoses": ["any explicitly stated diagnoses, exact wording"],
  "questionsForClinician": ["3-5 relevant questions the patient could ask their doctor about this report"],
  "confidence": 0.0 to 1.0 based on text clarity and completeness,
  "timelineEvents": [
    {
      "eventType": "lab_report | prescription | discharge | diagnosis | procedure | doctor_note | other",
      "title": "short title for the timeline",
      "description": "1-2 sentence description",
      "eventDate": "YYYY-MM-DD if determinable"
    }
  ]
}`;

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.1,
            topP: 0.8,
            maxOutputTokens: 4096,
          },
        }),
      }
    );

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error("Gemini API error:", errorText);
      await supabase
        .from("medical_documents")
        .update({
          processing_status: "needs_review",
          extracted_text: extractedText,
          error_message: "AI analysis failed. The extracted text is available for manual review.",
        })
        .eq("id", documentId)
        .eq("user_id", userId);

      return new Response(
        JSON.stringify({ error: "AI analysis failed", extractedText }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const geminiData = await geminiResponse.json();
    const responseText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || "";

    let parsed: Record<string, unknown>;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
    } catch {
      parsed = {};
    }

    const aiSummary = (parsed.summary as string) || "";
    const aiExplanation = (parsed.explanation as string) || "";
    const questions = (parsed.questionsForClinician as string[]) || [];
    const confidence = (parsed.confidence as number) || 0.5;
    const detectedType = (parsed.documentType as string) || documentType;
    const reportDate = (parsed.reportDate as string) || null;
    const sourceOrg = (parsed.sourceOrganization as string) || "";

    // Update the document with AI results
    await supabase
      .from("medical_documents")
      .update({
        processing_status: "ai_summary_ready",
        extracted_text: extractedText,
        ai_summary: aiSummary,
        ai_explanation: aiExplanation,
        questions_for_clinician: questions,
        extraction_confidence: confidence,
        document_type: detectedType,
        report_date: reportDate || null,
        source_organization: sourceOrg,
        error_message: "",
      })
      .eq("id", documentId)
      .eq("user_id", userId);

    // Insert lab results
    const labResults = (parsed.labResults as Array<Record<string, string>>) || [];
    if (labResults.length > 0) {
      const labRows = labResults
        .filter((r) => r.testName && r.value)
        .map((r) => ({
          user_id: userId,
          document_id: documentId,
          test_name: r.testName,
          value: r.value || "",
          unit: r.unit || "",
          reference_range: r.referenceRange || "",
          is_out_of_range: r.flag === "H" || r.flag === "L" || r.flag === "abnormal",
          flag: r.flag || "normal",
          report_date: reportDate || null,
        }));

      if (labRows.length > 0) {
        await supabase.from("lab_results").insert(labRows);
      }
    }

    // Insert medications
    const medications = (parsed.medications as Array<Record<string, string>>) || [];
    if (medications.length > 0) {
      const medRows = medications
        .filter((m) => m.medicineName)
        .map((m) => ({
          user_id: userId,
          document_id: documentId,
          medicine_name: m.medicineName,
          dosage: m.dosage || "",
          frequency: m.frequency || "",
          duration: m.duration || "",
          prescribing_clinician: m.prescribingClinician || "",
          source_document_name: fileName,
          prescription_date: reportDate || null,
          is_current: false,
        }));

      if (medRows.length > 0) {
        await supabase.from("medications").insert(medRows);
      }
    }

    // Insert timeline events
    const timelineEvents = (parsed.timelineEvents as Array<Record<string, string>>) || [];
    if (timelineEvents.length > 0) {
      const eventRows = timelineEvents
        .filter((e) => e.title)
        .map((e) => ({
          user_id: userId,
          document_id: documentId,
          event_date: e.eventDate || reportDate || new Date().toISOString().split("T")[0],
          event_type: e.eventType || "other",
          title: e.title,
          description: e.description || "",
          source_document_name: fileName,
        }));

      if (eventRows.length > 0) {
        await supabase.from("timeline_events").insert(eventRows);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        aiSummary,
        aiExplanation,
        questions,
        confidence,
        labResults: labResults.filter((r) => r.testName && r.value),
        medications: medications.filter((m) => m.medicineName),
        timelineEvents: timelineEvents.filter((e) => e.title),
        detectedType,
        reportDate,
        sourceOrg,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Edge function error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
