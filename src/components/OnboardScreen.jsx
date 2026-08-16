import React, { useState } from 'react';
import { db } from '../firebase'; // verify if needed, or if sbUpdateUser/sbAddLog/loadLogs are passed as props

export default function OnboardScreen({ 
  currentUser, 
  onboardStep, setOnboardStep, 
  onboard, setOnboard, 
  setScreen, 
  COLORS, FONTS, S, isDark, notify, scheduleSlots,
  sbUpdateUser, sbAddLog, loadLogs, setCurrentUser, saveSession
}) {
  const ONBOARD_STEPS = [
    { step: 0, emoji: "🎯", title: "What's your main goal?", subtitle: "This shapes your meal plan, calorie targets & workouts." },
    { step: 1, emoji: "📏", title: "Tell us about yourself", subtitle: "Used to calculate your personalised calorie & macro targets." },
    { step: 2, emoji: "💪", title: "Your fitness style", subtitle: "Pick 3+ foods you enjoy — we'll build meals around them." },
    { step: 3, emoji: "🎉", title: "You're all set!", subtitle: "Your personalised plan is ready." },
  ];
  const currentStep = ONBOARD_STEPS[onboardStep] || ONBOARD_STEPS[0];
  const pct = Math.round((onboardStep / 3) * 100);

  const QUICK_GOALS = [
    { label: "Lose Weight", emoji: "🔥", desc: "Burn fat, get lean" },
    { label: "Build Muscle", emoji: "💪", desc: "Gain strength & mass" },
    { label: "Stay Healthy", emoji: "🌿", desc: "Balanced lifestyle" },
    { label: "Improve Fitness", emoji: "⚡", desc: "More energy & endurance" },
  ];

  const POPULAR_FOODS = [
    "Dal Rice","Chapati","Idli","Dosa","Poha","Oats","Eggs","Chicken","Paneer","Curd",
    "Banana","Apple","Salad","Brown Rice","Upma","Sandwich","Soup","Fish","Sprouts","Fruits",
  ];
  const [foodSearch, setFoodSearch] = useState("");
  const foodMatches = foodSearch.trim()
    ? POPULAR_FOODS.filter(f => f.toLowerCase().includes(foodSearch.toLowerCase()))
    : POPULAR_FOODS;
  const pickedFoods = onboard.quickFoods || [];

  const toggleFood = (f) => setOnboard(p => {
    const cur = p.quickFoods || [];
    return { ...p, quickFoods: cur.includes(f) ? cur.filter(x => x !== f) : [...cur, f] };
  });

  const canStep1 = onboard.goal;
  const canStep2 = onboard.weight && onboard.height && onboard.age && onboard.gender && onboard.name && onboard.location;
  const canStep3 = onboard.fitnessLevel;

  const finishOnboard = async () => {
    const profile = {
      ...onboard,
      goal: onboard.goal,
      fitnessLevel: onboard.fitnessLevel || "Moderate",
      workoutType: onboard.workoutType || "Home",
      workoutFrequency: onboard.workoutFrequency || "3x per week",
      likedFoods: { Breakfast: pickedFoods.slice(0,5), Lunch: pickedFoods.slice(0,5), Dinner: pickedFoods.slice(0,5) },
      foodPref: onboard.foodPref || "Vegetarian",
      country: currentUser?.country || "India",
      schedule: scheduleSlots,
    };
    const error = await sbUpdateUser(currentUser.id, { profile_data: profile });
    if (error) return notify("Could not save profile. Try again.");
    const updated = { ...currentUser, profile };
    setCurrentUser(updated);
    saveSession(updated);
    if (parseFloat(onboard.weight)) {
      await sbAddLog({ user_id: currentUser.id, weight: parseFloat(onboard.weight), note: "Initial log", logged_at: new Date().toISOString() });
      await loadLogs(currentUser.id);
    }
    setOnboardStep(3);
  };

  return (
    <div style={{ ...S.app, minHeight:"100vh", display:"flex", flexDirection:"column", justifyContent:"center", alignItems:"center" }}>
      <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      <style>{`
        * { box-sizing:border-box; -webkit-font-smoothing:antialiased; }
        select option { background:#0e1628; color:#eef2ff; }
        @keyframes fadeSlide { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        @keyframes popIn { from { transform:scale(0.8); opacity:0; } to { transform:scale(1); opacity:1; } }
        .ob-fade { animation: fadeSlide 0.35s ease forwards; }
        .ob-pop { animation: popIn 0.4s cubic-bezier(.34,1.56,.64,1) forwards; }
      `}</style>

      <div style={{ width:"100%", maxWidth:480, padding:"16px", boxSizing:"border-box" }}>

        {/* Progress bar — hide on success step */}
        {onboardStep < 3 && (
          <div style={{ marginBottom:24 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
              <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                {onboardStep > 0 && (
                  <button onClick={() => setOnboardStep(p => p - 1)}
                    style={{ background:"transparent", border:"none", color:COLORS.muted, fontSize:20, cursor:"pointer", padding:"0 4px" }}>←</button>
                )}
                <span style={{ fontSize:12, color:COLORS.accent, fontWeight:700, letterSpacing:1 }}>STEP {onboardStep + 1} OF 3</span>
              </div>
              <span style={{ fontSize:12, color:COLORS.muted }}>{pct}% complete</span>
            </div>
            <div style={{ height:5, background:COLORS.card3, borderRadius:10, overflow:"hidden" }}>
              <div style={{ height:"100%", width:`${pct}%`, borderRadius:10, transition:"width 0.5s cubic-bezier(.4,0,.2,1)",
                background:`linear-gradient(90deg, ${COLORS.accent}, ${COLORS.accent2})` }} />
            </div>
            {/* Step dots */}
            <div style={{ display:"flex", justifyContent:"center", gap:8, marginTop:12 }}>
              {[0,1,2].map(i => (
                <div key={i} style={{ width: i === onboardStep ? 24 : 8, height:8, borderRadius:10,
                  background: i <= onboardStep ? COLORS.accent : COLORS.card3,
                  transition:"all 0.3s" }} />
              ))}
            </div>
          </div>
        )}

        {/* Card */}
        <div className="ob-fade" key={onboardStep}
          style={{ background:COLORS.card, border:`1px solid ${COLORS.border}`, borderRadius:24,
            padding:"28px 24px", boxShadow: isDark ? "0 20px 60px rgba(0,0,0,0.5)" : "0 20px 60px rgba(99,130,191,0.15)" }}>

          {/* Step header */}
          <div style={{ textAlign:"center", marginBottom:24 }}>
            <div style={{ fontSize:48, marginBottom:10, lineHeight:1 }}>{currentStep.emoji}</div>
            <div style={{ fontFamily:FONTS.head, fontSize:22, fontWeight:800, marginBottom:6, color:COLORS.text }}>{currentStep.title}</div>
            <div style={{ fontSize:13, color:COLORS.muted, lineHeight:1.6 }}>{currentStep.subtitle}</div>
          </div>

          {/* ── STEP 1: Goal ── */}
          {onboardStep === 0 && (
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {QUICK_GOALS.map(g => (
                <button key={g.label} onClick={() => { setOnboard(p => ({ ...p, goal: g.label })); setOnboardStep(1); }}
                  style={{ display:"flex", alignItems:"center", gap:14, padding:"16px 18px", borderRadius:16, cursor:"pointer",
                    border:`2px solid ${onboard.goal === g.label ? COLORS.accent : COLORS.border}`,
                    background: onboard.goal === g.label ? `linear-gradient(135deg, ${COLORS.accent}18, ${COLORS.accent2}18)` : COLORS.card2,
                    transition:"all 0.2s", textAlign:"left" }}>
                  <span style={{ fontSize:28, flexShrink:0 }}>{g.emoji}</span>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:15, fontWeight:700, color:COLORS.text }}>{g.label}</div>
                    <div style={{ fontSize:12, color:COLORS.muted, marginTop:2 }}>{g.desc}</div>
                  </div>
                  {onboard.goal === g.label && <span style={{ fontSize:18, color:COLORS.accent }}>✓</span>}
                </button>
              ))}
            </div>
          )}

          {/* ── STEP 2: Body details ── */}
          {onboardStep === 1 && (
            <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                <div>
                  <label style={{ ...S.label, fontSize:11 }}>👤 Full Name</label>
                  <input type="text" placeholder="e.g. John Doe" value={onboard.name||""}
                    onChange={e => setOnboard(p => ({...p, name:e.target.value}))}
                    style={{ ...S.input, fontSize:15, fontWeight:600, textAlign:"center" }} />
                </div>
                <div>
                  <label style={{ ...S.label, fontSize:11 }}>🌍 Location</label>
                  <input type="text" placeholder="e.g. London, UK" value={onboard.location||""}
                    onChange={e => setOnboard(p => ({...p, location:e.target.value}))}
                    style={{ ...S.input, fontSize:15, fontWeight:600, textAlign:"center" }} />
                </div>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                {[["weight","⚖️ Weight (kg)","number"],["height","📏 Height (cm)","number"]].map(([k,lbl,t]) => (
                  <div key={k}>
                    <label style={{ ...S.label, fontSize:11 }}>{lbl}</label>
                    <input type={t} placeholder={k === "weight" ? "e.g. 75" : "e.g. 170"} value={onboard[k]||""}
                      onChange={e => setOnboard(p => ({...p,[k]:e.target.value}))}
                      style={{ ...S.input, fontSize:15, fontWeight:600, textAlign:"center" }} />
                  </div>
                ))}
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                <div>
                  <label style={{ ...S.label, fontSize:11 }}>🎂 Age</label>
                  <input type="number" placeholder="e.g. 28" value={onboard.age||""}
                    onChange={e => setOnboard(p => ({...p, age:e.target.value}))}
                    style={{ ...S.input, fontSize:15, fontWeight:600, textAlign:"center" }} />
                </div>
                <div>
                  <label style={{ ...S.label, fontSize:11 }}>Gender</label>
                  <div style={{ display:"flex", gap:6, marginTop:6 }}>
                    {["Male","Female"].map(g => (
                      <button key={g} onClick={() => setOnboard(p => ({...p, gender:g}))}
                        style={{ flex:1, padding:"9px 6px", borderRadius:10, cursor:"pointer", fontWeight:600, fontSize:13,
                          border:`2px solid ${onboard.gender===g?COLORS.accent:COLORS.border}`,
                          background: onboard.gender===g ? `${COLORS.accent}18` : COLORS.card2, color:COLORS.text }}>
                        {g === "Male" ? "♂ Male" : "♀ Female"}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div>
                <label style={{ ...S.label, fontSize:11 }}>🎯 Target Weight (kg) <span style={{ color:COLORS.muted, fontWeight:400 }}>— optional</span></label>
                <input type="number" placeholder="e.g. 65" value={onboard.targetWeight||""}
                  onChange={e => setOnboard(p => ({...p, targetWeight:e.target.value}))}
                  style={{ ...S.input, fontSize:15, fontWeight:600, textAlign:"center" }} />
              </div>
              <button onClick={() => { if (!canStep2) return notify("Please fill in all details (name, location, weight, height, age, gender)"); setOnboardStep(2); }}
                style={{ ...S.btn, padding:"14px", fontSize:15, fontWeight:700, borderRadius:14,
                  opacity: canStep2 ? 1 : 0.5 }}>
                Continue →
              </button>
            </div>
          )}

          {/* ── STEP 3: Fitness + Foods ── */}
          {onboardStep === 2 && (
            <div style={{ display:"flex", flexDirection:"column", gap:18 }}>
              {/* Fitness level */}
              <div>
                <label style={{ ...S.label, fontSize:12, marginBottom:8 }}>🏋️ Fitness Level</label>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8 }}>
                  {[["Beginner","🌱","Just starting"],["Moderate","⚡","Some exercise"],["Active","🔥","Regular gym"]].map(([l,e,d]) => (
                    <button key={l} onClick={() => setOnboard(p => ({...p, fitnessLevel:l}))}
                      style={{ padding:"12px 8px", borderRadius:12, cursor:"pointer", textAlign:"center",
                        border:`2px solid ${onboard.fitnessLevel===l?COLORS.accent:COLORS.border}`,
                        background: onboard.fitnessLevel===l ? `${COLORS.accent}18` : COLORS.card2 }}>
                      <div style={{ fontSize:22 }}>{e}</div>
                      <div style={{ fontSize:12, fontWeight:700, color:COLORS.text, marginTop:4 }}>{l}</div>
                      <div style={{ fontSize:10, color:COLORS.muted, marginTop:2 }}>{d}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Workout preference */}
              <div>
                <label style={{ ...S.label, fontSize:12, marginBottom:8 }}>🏃 Workout Style</label>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8 }}>
                  {[["Home","🏠"],["Gym","🏋️"],["Outdoor","🌿"]].map(([l,e]) => (
                    <button key={l} onClick={() => setOnboard(p => ({...p, workoutType:l}))}
                      style={{ padding:"10px 6px", borderRadius:12, cursor:"pointer", textAlign:"center",
                        border:`2px solid ${onboard.workoutType===l?COLORS.accent2:COLORS.border}`,
                        background: onboard.workoutType===l ? `${COLORS.accent2}18` : COLORS.card2 }}>
                      <div style={{ fontSize:22 }}>{e}</div>
                      <div style={{ fontSize:12, fontWeight:700, color:COLORS.text, marginTop:4 }}>{l}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Food picks */}
              <div>
                <label style={{ ...S.label, fontSize:12, marginBottom:4 }}>
                  🍽️ Foods you enjoy <span style={{ color:COLORS.muted, fontWeight:400 }}>— pick 3+</span>
                  {pickedFoods.length > 0 && <span style={{ color:COLORS.accent, marginLeft:8 }}>{pickedFoods.length} selected</span>}
                </label>
                <input placeholder="Search foods..." value={foodSearch} onChange={e => setFoodSearch(e.target.value)}
                  style={{ ...S.input, marginBottom:8, fontSize:13 }} />
                <div style={{ display:"flex", flexWrap:"wrap", gap:6, maxHeight:140, overflowY:"auto" }}>
                  {foodMatches.map(f => (
                    <button key={f} onClick={() => toggleFood(f)}
                      style={{ padding:"6px 12px", borderRadius:20, fontSize:12, cursor:"pointer", fontWeight:600,
                        border:`1.5px solid ${pickedFoods.includes(f)?COLORS.accent:COLORS.border}`,
                        background: pickedFoods.includes(f) ? `${COLORS.accent}20` : COLORS.card2,
                        color: pickedFoods.includes(f) ? COLORS.accent : COLORS.text,
                        transition:"all 0.15s" }}>
                      {pickedFoods.includes(f) ? "✓ " : ""}{f}
                    </button>
                  ))}
                </div>
              </div>

              <button onClick={() => { if (!canStep3) return notify("Please select your fitness level"); finishOnboard(); }}
                style={{ ...S.btn, padding:"14px", fontSize:15, fontWeight:700, borderRadius:14,
                  opacity: canStep3 ? 1 : 0.5 }}>
                Complete Setup 🎉
              </button>
            </div>
          )}

          {/* ── STEP 4: Success ── */}
          {onboardStep === 3 && (
            <div className="ob-pop" style={{ textAlign:"center" }}>
              <div style={{ fontSize:72, marginBottom:16, lineHeight:1 }}>🎉</div>
              <div style={{ fontFamily:FONTS.head, fontSize:24, fontWeight:800, marginBottom:8, color:COLORS.accent }}>
                Welcome to StayFit!
              </div>
              <div style={{ fontSize:14, color:COLORS.muted, lineHeight:1.8, marginBottom:24 }}>
                Your personalised plan is ready.<br />
                Goal: <b style={{ color:COLORS.text }}>{onboard.goal}</b> · {onboard.fitnessLevel} level<br />
                {onboard.weight && onboard.targetWeight && (
                  <span>Starting at <b style={{ color:COLORS.text }}>{onboard.weight}kg</b> → Target <b style={{ color:COLORS.accent }}>{onboard.targetWeight}kg</b></span>
                )}
              </div>

              {/* What's waiting */}
              <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:24, textAlign:"left" }}>
                {[
                  { emoji:"📅", text:"Daily food & weight logging" },
                  { emoji:"🤖", text:"AI meal plans & health coach" },
                  { emoji:"🏋️", text:"Custom workout plan" },
                  { emoji:"📊", text:"Progress charts & insights" },
                ].map(item => (
                  <div key={item.text} style={{ display:"flex", gap:12, alignItems:"center", padding:"10px 14px",
                    borderRadius:10, background:COLORS.card2, border:`1px solid ${COLORS.accent}22` }}>
                    <span style={{ fontSize:20 }}>{item.emoji}</span>
                    <span style={{ fontSize:13, color:COLORS.text }}>{item.text}</span>
                    <span style={{ marginLeft:"auto", fontSize:14, color:COLORS.success }}>✓</span>
                  </div>
                ))}
              </div>

              <button onClick={() => setScreen("dashboard")}
                style={{ ...S.btn, padding:"16px", fontSize:16, fontWeight:800, borderRadius:16,
                  background:`linear-gradient(135deg, ${COLORS.accent}, ${COLORS.accent2})`,
                  boxShadow:`0 8px 24px ${COLORS.accent}44` }}>
                Let's Go! →
              </button>
              <div style={{ fontSize:12, color:COLORS.muted, marginTop:12 }}>
                You can complete detailed settings (schedule, medical info, food preferences) anytime from the ⚙️ Preferences tab
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
