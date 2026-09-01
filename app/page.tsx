"use client";
import './landing.css';

import {
  ArrowRight,
  Check,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { BrandLogo } from "@/components/Navbar";
import { LandingNavbar } from "@/components/LandingNavbar";

const features = [
  ["01", "แนะนำเมนูเฉพาะคุณ", "AI เข้าใจเป้าหมาย รสนิยม และข้อจำกัดของคุณ"],
  ["02", "ปลอดภัยกับสุขภาพ", "คำนวณพลังงานและกรอง NCDs ให้ทุกมื้อ"],
  ["03", "ใช้ของที่มีอยู่", "เปลี่ยนวัตถุดิบในครัวให้เป็นเมนูที่อยากกิน"],
];

export default function Home() {
  return (
    <div className="v0-landing-scope">
    <LandingNavbar />
    <main id="top">
      <section className="hero shell">
        <div className="hero-copy">
          <div className="kicker">
            <Sparkles /> โภชนาการที่ออกแบบมาเพื่อคุณ
          </div>
          <h1>
            เปลี่ยนวัตถุดิบในครัว
            <br />
            <em>ให้เป็นเมนูของคุณ</em>
          </h1>
          <p>
            ผู้ช่วยโภชนาการ AI ที่วางแผนมื้อลดน้ำหนักอย่างปลอดภัย จากสุขภาพ
            เป้าหมาย และของที่คุณมีอยู่จริง
          </p>
          <div className="hero-actions">
            <a href="/onboarding" className="primary-button">
              เริ่มต้นฟรี <ArrowRight />
            </a>
            <a href="#how" className="quiet-link">
              ดูวิธีการทำงาน <ChevronRight />
            </a>
          </div>
          <div className="trust-row">
            <Check /> ออกแบบโดยผู้เชี่ยวชาญด้านโภชนาการ <strong>12,000+</strong>{" "}
            ผู้ใช้งาน
          </div>
        </div>
        <div className="hero-visual">
          <div className="grid-texture" />
          <div className="recipe-card">
            <div className="recipe-topline">
              <span className="pill">เมนูที่เหมาะกับคุณ</span>
              <span className="dots">•••</span>
            </div>
            <div className="dish-art">
              <div className="dish-bowl">
                <span />
                <span />
                <span />
                <span />
              </div>
            </div>
            <div className="recipe-copy">
              <div>
                <p className="eyebrow">มื้อกลางวัน · 520 kcal</p>
                <h3>แซลมอนอะโวคาโดโบวล์</h3>
              </div>
              <span className="round-button">
                <ArrowRight />
              </span>
            </div>
            <div className="macro-row">
              <span>
                <b>โปรตีน</b> 34g
              </span>
              <span>
                <b>คาร์บ</b> 42g
              </span>
              <span>
                <b>ไขมัน</b> 18g
              </span>
            </div>
          </div>
          <div className="floating-note note-one">
            <Check /> วัตถุดิบที่มีอยู่
          </div>
          <div className="floating-note note-two">
            พลังงานพอดี <b>98%</b>
          </div>
        </div>
      </section>
      <section className="features-section shell" id="features">
        <div className="section-heading">
          <div>
            <span className="section-label">ทำไมต้อง NutriGenie</span>
            <h2>
              สุขภาพดี
              <br />
              <em>ไม่ต้องฝืน</em>
            </h2>
          </div>
          <p>เราเปลี่ยนข้อมูลสุขภาพให้เป็นมื้ออาหารที่คุณอยากกินจริง ๆ</p>
        </div>
        <div className="features-grid">
          {features.map(([number, title, text]) => (
            <article className="feature-card" key={number}>
              <span className="step-num">{number}</span>
              <h3>{title}</h3>
              <p>{text}</p>
              <a href="/onboarding" className="text-link">
                เริ่มต้นเลย <ArrowRight />
              </a>
            </article>
          ))}
        </div>
      </section>
      <section className="workflow shell" id="how">
        <div className="section-heading compact">
          <div>
            <span className="section-label">เริ่มต้นง่าย ๆ</span>
            <h2>
              สามขั้นตอน
              <br />
              <em>สู่มื้อที่ดีขึ้น</em>
            </h2>
          </div>
        </div>
        <div className="steps">
          {[
            ["01", "บอกเราเกี่ยวกับคุณ", "เป้าหมาย สุขภาพ และอาหารที่ชอบ"],
            ["02", "เลือกวัตถุดิบ", "สิ่งที่มีอยู่ในครัวของคุณ"],
            ["03", "รับเมนูจาก AI", "ทำตามได้จริง อร่อย และปลอดภัย"],
          ].map(([n, t, d]) => (
            <div className="step" key={n}>
              <span className="step-num">{n}</span>
              <div>
                <h3>{t}</h3>
                <p>{d}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
      <section className="cta-section shell">
        <div className="cta-card">
          <div>
            <span className="section-label">มื้อที่ดี เริ่มต้นที่นี่</span>
            <h2>
              พร้อมจะกินดีขึ้น
              <br />
              <em>ในแบบของคุณหรือยัง?</em>
            </h2>
          </div>
          <a href="/onboarding" className="primary-button light">
            สร้างแผนของฉัน <ArrowRight />
          </a>
        </div>
      </section>
      <footer className="footer shell">
        <BrandLogo />
        <span>NutriGenie · กินดีขึ้นในแบบของคุณ</span>
        <a href="#top">กลับขึ้นด้านบน ↑</a>
      </footer>
    </main>
    </div>
  );
}
