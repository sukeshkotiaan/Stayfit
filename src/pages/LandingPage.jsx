import React from 'react';
import { motion } from 'framer-motion';
import { GlobalStyles } from '../components/Theme';

export default function LandingPage({ isDark, C, S, navigate }) {
  const features = [
    { icon: '🧬', title: 'Smart Body Metrics', desc: 'Track BMI, body fat, muscle mass, and metabolic age — recalculated every log.' },
    { icon: '🍱', title: 'AI Meal Plans', desc: 'Personalised 7-day plans based on your goal, foods you love, and medical history.' },
    { icon: '💪', title: 'Custom Workouts', desc: 'Gym or home splits generated for your fitness level and weekly frequency.' },
    { icon: '📸', title: 'Progress Photos', desc: 'Side-by-side before/after comparison to see your transformation over time.' },
    { icon: '🤖', title: 'AI Chat Coach', desc: 'Ask anything — diet, workout, health — and get instant personalised answers.' },
    { icon: '🏆', title: 'Group Challenges', desc: 'Stay motivated with step, calorie, and streak challenges in your friend circle.' },
  ];

  return (
    <div style={{ ...S.app, overflowX: 'hidden' }}>
      <GlobalStyles isDark={isDark} />

      {/* Nav */}
      <nav style={{ ...S.nav }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 10,
            background: C.accent, display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 800, fontSize: 17
          }}>
            S
          </div>
          <span style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-0.02em', color: C.text }}>
            StayFit
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => navigate('/login')}
            style={{ ...S.btnSm, background: 'transparent', border: 'none', color: C.muted, fontWeight: 500, padding: '8px 14px' }}
          >
            Sign In
          </button>
          <button
            onClick={() => navigate('/onboard')}
            style={{ ...S.btnSm, background: C.accent, border: 'none', color: '#fff', fontWeight: 700, padding: '8px 18px', borderRadius: 10 }}
          >
            Get Started
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section style={{
        padding: 'clamp(56px, 10vw, 100px) 24px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        background: isDark
          ? `radial-gradient(ellipse 80% 50% at 50% -10%, ${C.accent}18 0%, transparent 70%)`
          : `radial-gradient(ellipse 80% 50% at 50% -10%, ${C.accent}14 0%, transparent 70%)`,
      }}>
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          style={{ maxWidth: 680 }}
        >
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '6px 14px', borderRadius: 20,
            border: `1px solid ${C.accent}40`,
            background: `${C.accent}10`,
            color: C.accent,
            fontSize: 13, fontWeight: 600,
            marginBottom: 28
          }}>
            <span>✦</span>
            <span>Free for your friend circle</span>
          </div>

          <h1 style={{
            fontSize: 'clamp(36px, 8vw, 60px)',
            fontWeight: 800,
            lineHeight: 1.08,
            letterSpacing: '-0.04em',
            marginBottom: 22,
            color: C.text
          }}>
            Your personal<br />
            <span style={{ color: C.accent }}>fitness coach</span><br />
            in your pocket.
          </h1>

          <p style={{
            fontSize: 'clamp(15px, 3vw, 18px)',
            color: C.muted,
            lineHeight: 1.65,
            maxWidth: 520,
            margin: '0 auto 40px',
            fontWeight: 400
          }}>
            AI meal plans, smart workouts, body metrics tracking, progress photos, and group challenges — all in one free app.
          </p>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => navigate('/onboard')}
              style={{ ...S.btn, width: 'auto', padding: '15px 32px', fontSize: 15, borderRadius: 12 }}
            >
              Start free →
            </button>
            <button
              onClick={() => navigate('/login')}
              style={{
                ...S.btn, width: 'auto', padding: '15px 32px', fontSize: 15, borderRadius: 12,
                background: 'transparent', color: C.text,
                border: `1px solid ${C.border}`,
                boxShadow: 'none'
              }}
            >
              Sign in
            </button>
          </div>

          {/* Social proof */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginTop: 40, flexWrap: 'wrap' }}>
            {['🍱 AI Meal Plans', '💪 Custom Workouts', '📈 Progress Tracking', '🏆 Challenges'].map(f => (
              <div key={f} style={{ fontSize: 12, color: C.muted, display: 'flex', alignItems: 'center', gap: 4 }}>
                {f}
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Features */}
      <section style={{ padding: 'clamp(40px, 8vw, 72px) 24px', background: isDark ? `${C.card}50` : C.card2 }}>
        <div style={{ maxWidth: 1080, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <h2 style={{ fontSize: 'clamp(24px, 5vw, 36px)', fontWeight: 800, color: C.text, marginBottom: 10, letterSpacing: '-0.03em' }}>
              Everything you need.
            </h2>
            <p style={{ fontSize: 15, color: C.muted, maxWidth: 420, margin: '0 auto' }}>
              Built for real people who want to feel better, not for fitness fanatics.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
            {features.map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.07, duration: 0.35 }}
                style={{ ...S.metricCard, padding: '24px 22px', display: 'flex', gap: 16, alignItems: 'flex-start' }}
              >
                <div style={{
                  width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                  background: `${C.accent}15`, border: `1px solid ${C.accent}25`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22
                }}>
                  {f.icon}
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 5, color: C.text }}>{f.title}</div>
                  <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.55 }}>{f.desc}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: 'clamp(48px, 8vw, 72px) 24px', textAlign: 'center' }}>
        <div style={{ maxWidth: 480, margin: '0 auto' }}>
          <h2 style={{ fontSize: 'clamp(24px, 5vw, 34px)', fontWeight: 800, color: C.text, letterSpacing: '-0.03em', marginBottom: 14 }}>
            Ready to start?
          </h2>
          <p style={{ fontSize: 15, color: C.muted, marginBottom: 32, lineHeight: 1.6 }}>
            It's free. No subscriptions, no ads. Just you and your goals.
          </p>
          <button
            onClick={() => navigate('/onboard')}
            style={{ ...S.btn, width: 'auto', padding: '16px 40px', fontSize: 15, borderRadius: 12, margin: '0 auto' }}
          >
            Create your free account →
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ padding: '28px 24px', borderTop: `1px solid ${C.border}`, textAlign: 'center', color: C.muted, fontSize: 13 }}>
        <div style={{ marginBottom: 14 }}>
          <a
            href={`https://wa.me/?text=${encodeURIComponent('Hi! 👋\n\nJoin *StayFit* — your free AI-powered health & fitness coach! 🏋️‍♂️\n\n✅ AI meal plans\n✅ Weight & progress tracking\n✅ Sleep, steps & calorie tracking\n✅ AI health insights\n✅ Custom workout plans\n\n🌐 *Open App:* https://stayfit-rho.vercel.app\n📋 *Register:* https://stayfit-rho.vercel.app/onboard\n\nFree forever. Sign up and get activated! 🚀')}`}
            target="_blank" rel="noreferrer"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 22px', borderRadius: 24, background: '#25D366', color: '#fff', fontWeight: 700, fontSize: 14, textDecoration: 'none' }}>
            🟢 Share StayFit on WhatsApp
          </a>
        </div>
        © 2026 StayFit — Stay consistent. Stay fit.
      </footer>
    </div>
  );
}
