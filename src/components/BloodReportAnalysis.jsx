import React, { useState, useRef } from "react";

export default function BloodReportAnalysis({ callAI, COLORS, FONTS, S }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const fileInputRef = useRef(null);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError("Image size must be less than 5MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setImagePreview(event.target.result);
      setError("");
      setResult(null);
    };
    reader.readAsDataURL(file);
  };

  const analyzeReport = async () => {
    if (!imagePreview) {
      setError("Please select an image first.");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      // Remove data:image/jpeg;base64, prefix
      const base64Data = imagePreview.split(',')[1];
      
      const prompt = `You are a medical expert AI. Analyze this blood test report image. Extract the key biomarkers, compare them against standard reference ranges, and provide a plain-English summary.
If the image does not look like a blood test report, return an error message in the JSON.
Return ONLY valid JSON in this exact format:
{
  "summary": "Overall 2-3 sentence summary in simple terms.",
  "biomarkers": [
    {
      "name": "Biomarker Name (e.g. Total Cholesterol)",
      "value": "The value found",
      "status": "high|normal|low",
      "meaning": "What this means for the user's health in 1 sentence"
    }
  ],
  "recommendations": ["Actionable tip 1", "Actionable tip 2"]
}`;

      const { text } = await callAI(prompt, 1500, base64Data);
      
      let cleanText = text.trim().replace(/```json/g, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(cleanText);
      
      if (parsed.error) {
        throw new Error(parsed.error);
      }
      
      setResult(parsed);
    } catch (err) {
      console.error(err);
      setError("Failed to analyze the report. Please ensure the image is clear and try again.");
    } finally {
      setLoading(false);
    }
  };

  const statusColor = (status) => {
    if (status === "normal") return COLORS.success;
    if (status === "high" || status === "low") return COLORS.warn;
    return COLORS.muted;
  };

  const statusBg = (status) => {
    if (status === "normal") return `${COLORS.success}15`;
    if (status === "high" || status === "low") return `${COLORS.warn}15`;
    return `${COLORS.muted}15`;
  };

  return (
    <div style={{ ...S.metricCard, marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div>
          <div style={{ fontFamily: FONTS.head, fontSize: 16, fontWeight: 700 }}>🔬 Blood Report Analysis</div>
          <div style={{ fontSize: 11, color: COLORS.muted, marginTop: 2 }}>Upload a photo of your lab results for instant AI insights</div>
        </div>
      </div>

      {!imagePreview && !loading && !result && (
        <div 
          onClick={() => fileInputRef.current?.click()}
          style={{ 
            border: `2px dashed ${COLORS.border}`, 
            borderRadius: 12, 
            padding: "30px 20px", 
            textAlign: "center",
            cursor: "pointer",
            background: `rgba(255,255,255,0.02)`,
            transition: "all 0.2s"
          }}
        >
          <div style={{ fontSize: 32, marginBottom: 8 }}>📸</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: COLORS.text }}>Tap to Upload Report</div>
          <div style={{ fontSize: 11, color: COLORS.muted, marginTop: 4 }}>JPG, PNG (Max 5MB)</div>
        </div>
      )}

      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleImageUpload} 
        accept="image/jpeg, image/png, image/webp" 
        style={{ display: "none" }} 
      />

      {error && (
        <div style={{ padding: "10px", background: `${COLORS.warn}15`, border: `1px solid ${COLORS.warn}44`, borderRadius: 8, color: COLORS.warn, fontSize: 12, marginTop: 10, display: "flex", alignItems: "center", gap: 8 }}>
          <span>⚠️</span> {error}
        </div>
      )}

      {imagePreview && !result && (
        <div style={{ marginTop: 14 }}>
          <div style={{ position: "relative", borderRadius: 12, overflow: "hidden", marginBottom: 12, border: `1px solid ${COLORS.border}` }}>
            <img src={imagePreview} alt="Report Preview" style={{ width: "100%", maxHeight: 200, objectFit: "cover", display: "block" }} />
            {!loading && (
              <button 
                onClick={() => { setImagePreview(null); setError(""); }}
                style={{ position: "absolute", top: 8, right: 8, background: "rgba(0,0,0,0.6)", color: "white", border: "none", borderRadius: "50%", width: 28, height: 28, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
              >✕</button>
            )}
          </div>
          
          <button 
            onClick={analyzeReport} 
            disabled={loading}
            style={{ ...S.btn, width: "100%", opacity: loading ? 0.7 : 1 }}
          >
            {loading ? "🤖 Analyzing Lab Data..." : "✨ Analyze Report"}
          </button>
        </div>
      )}

      {loading && (
        <div style={{ padding: "1rem 0", textAlign: "center" }}>
          <div className="sf-skeleton" style={{ height: 100, marginBottom: 12, borderRadius: 10 }} />
          <div className="sf-skeleton" style={{ height: 60, marginBottom: 8, borderRadius: 10 }} />
          <div className="sf-skeleton" style={{ height: 60, marginBottom: 8, borderRadius: 10 }} />
          <div style={{ fontSize: 12, color: COLORS.muted, marginTop: 12, display: "flex", justifyContent: "center", alignItems: "center", gap: 6 }}>
            <div className="sf-spinner" style={{ width: 14, height: 14, borderTopColor: COLORS.accent }} />
            Reading biomarkers...
          </div>
        </div>
      )}

      {result && !loading && (
        <div style={{ marginTop: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.accent }}>Results Summary</div>
            <button 
              onClick={() => { setResult(null); setImagePreview(null); }}
              style={{ ...S.btnSm, background: "transparent", color: COLORS.muted, border: `1px solid ${COLORS.border}`, padding: "4px 10px" }}
            >
              Upload Another
            </button>
          </div>

          <div style={{ fontSize: 13, lineHeight: 1.6, color: COLORS.text, marginBottom: 16, padding: 12, background: `rgba(255,255,255,0.03)`, borderRadius: 10, border: `1px solid ${COLORS.border}` }}>
            {result.summary}
          </div>

          <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.muted, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>Biomarkers Detected</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
            {(result.biomarkers || []).map((b, i) => (
              <div key={i} style={{ padding: 12, borderRadius: 10, background: statusBg(b.status), border: `1px solid ${statusColor(b.status)}40` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{b.name}</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: statusColor(b.status), background: `rgba(255,255,255,0.5)`, padding: "2px 8px", borderRadius: 10 }}>
                    {b.value}
                  </div>
                </div>
                <div style={{ fontSize: 11, color: COLORS.text, opacity: 0.85, lineHeight: 1.4 }}>{b.meaning}</div>
              </div>
            ))}
            {(!result.biomarkers || result.biomarkers.length === 0) && (
              <div style={{ fontSize: 12, color: COLORS.muted, fontStyle: "italic" }}>No specific biomarkers could be read clearly.</div>
            )}
          </div>

          {(result.recommendations && result.recommendations.length > 0) && (
            <>
              <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.muted, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>Recommendations</div>
              <ul style={{ margin: 0, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 6 }}>
                {result.recommendations.map((rec, i) => (
                  <li key={i} style={{ fontSize: 12, color: COLORS.text, lineHeight: 1.5 }}>{rec}</li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}
