import React from 'react';
import { motion } from 'framer-motion';
import { GlobalStyles } from '../components/Theme';

export default function LandingPage({ isDark, C, S, navigate }) {
  return (
    <div style={{ ...S.app, overflowX: 'hidden' }}>
      <GlobalStyles isDark={isDark} />
      
      {/* Navigation Bar */}
      <nav style={{ ...S.nav, borderBottom: `1px solid ${C.border}`, background: C.bg }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ 
            width: 32, height: 32, borderRadius: 8, 
            background: C.accent, display: 'flex', 
            alignItems: 'center', justifyContent: 'center',
            color: '#000', fontWeight: 'bold', fontSize: 18 
          }}>
            V
          </div>
          <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em', color: C.text }}>
            VitaTrack
          </span>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button 
            onClick={() => navigate('/login')}
            style={{ ...S.btnSm, background: 'transparent', border: 'none', color: C.text, fontWeight: 500 }}
          >
            Log In
          </button>
          <button 
            onClick={() => navigate('/onboard')}
            style={{ ...S.btnSm, background: C.text, color: C.bg, border: 'none', fontWeight: 600 }}
          >
            Get Started
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section style={{ 
        padding: '80px 24px', 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        textAlign: 'center',
        background: `radial-gradient(circle at 50% -20%, ${C.accent}20 0%, ${C.bg} 70%)` 
      }}>
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          style={{ maxWidth: 800 }}
        >
          <div style={{ 
            display: 'inline-block', 
            padding: '6px 16px', 
            borderRadius: 20, 
            border: `1px solid ${C.border}`, 
            background: C.card,
            color: C.muted, 
            fontSize: 13, 
            fontWeight: 500,
            marginBottom: 24 
          }}>
            ✨ Your AI-Powered Fitness Companion
          </div>
          <h1 style={{ 
            fontSize: 'clamp(40px, 8vw, 64px)', 
            fontWeight: 800, 
            lineHeight: 1.1, 
            letterSpacing: '-0.03em',
            marginBottom: 24,
            color: C.text 
          }}>
            Train smarter.<br />Live healthier.
          </h1>
          <p style={{ 
            fontSize: 'clamp(16px, 4vw, 20px)', 
            color: C.muted, 
            lineHeight: 1.5, 
            marginBottom: 40,
            maxWidth: 600,
            margin: '0 auto 40px'
          }}>
            VitaTrack combines AI-driven meal planning, intelligent workout scheduling, and deep health analytics into one beautifully simple app.
          </p>
          
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button 
              onClick={() => navigate('/onboard')}
              style={{ ...S.btn, width: 'auto', padding: '16px 32px', fontSize: 16 }}
            >
              Start Your Journey
            </button>
            <button 
              onClick={() => navigate('/login')}
              style={{ ...S.btn, width: 'auto', padding: '16px 32px', fontSize: 16, background: C.card, color: C.text, border: `1px solid ${C.border}` }}
            >
              Returning User
            </button>
          </div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section style={{ padding: '60px 24px', background: C.bg }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <h2 style={{ fontSize: 32, fontWeight: 700, textAlign: 'center', marginBottom: 60, color: C.text }}>
            Everything you need. Nothing you don't.
          </h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
            {[
              { icon: '📊', title: 'Smart Analytics', desc: 'Track your BMI, body fat, and metabolic age with deep AI insights.' },
              { icon: '🥗', title: 'Diet & Macros', desc: 'Log your meals and get personalized healthy swaps based on what you love.' },
              { icon: '📱', title: 'Native Experience', desc: 'Install directly to your iOS or Android device. No app store required.' },
            ].map((f, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                style={{ ...S.card, padding: 32 }}
              >
                <div style={{ fontSize: 40, marginBottom: 20 }}>{f.icon}</div>
                <h3 style={{ fontSize: 20, fontWeight: 600, marginBottom: 12, color: C.text }}>{f.title}</h3>
                <p style={{ color: C.muted, lineHeight: 1.5 }}>{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ padding: '40px 24px', borderTop: `1px solid ${C.border}`, textAlign: 'center', color: C.muted }}>
        <p>© 2026 VitaTrack Fitness. All rights reserved.</p>
      </footer>
    </div>
  );
}
