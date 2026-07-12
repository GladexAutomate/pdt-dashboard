import { useEffect, useRef, useState } from "react";
import { PartyPopper, Heart, Sparkles, Volume2, VolumeX } from "lucide-react";
import { C } from "../lib/theme";
import { fmtHours } from "../lib/daily";
import type { Gender } from "../lib/types";

/* Two look-and-feel themes: "girl" (pink/red/dark-blue, hearts) for female
   agents, "simple" (the app's normal teal look) for everyone else (male,
   other, or gender not set). */
const THEMES = {
  girl: {
    overlay: "rgba(27,42,107,0.55)",
    modalBg: "linear-gradient(165deg, #FFF6F9 0%, #ffffff 60%)",
    modalBorder: "#FFE3ED",
    iconBg: "linear-gradient(135deg, #FF3D7F, #C81155)",
    iconShadow: "0 8px 20px rgba(200,17,85,0.35)",
    titleColor: "#1B2A6B",
    bodyColor: "#1B2A6B",
    accentColor: "#C81155",
    panelBg: "#FFE3ED",
    panelBorder: "#FFD1E1",
    panelLabelColor: "#C81155",
    bullet: "💗",
    btnBg: "linear-gradient(135deg, #FF3D7F, #C81155)",
    btnShadow: "0 6px 16px rgba(200,17,85,0.3)",
    ghostBorder: "#E8EAFB",
    ghostColor: "#1B2A6B",
    confetti: ["#FF3D7F", "#C81155", "#FF8FAB", "#1B2A6B", "#3D5AFE", "#FFD1DC"],
    sparkles: true
  },
  simple: {
    overlay: "rgba(20,28,46,0.5)",
    modalBg: "#ffffff",
    modalBorder: "transparent",
    iconBg: C.tealSoft,
    iconShadow: "none",
    titleColor: C.text,
    bodyColor: C.sub,
    accentColor: C.text,
    panelBg: C.paper,
    panelBorder: C.line,
    panelLabelColor: C.sub,
    bullet: "✓",
    btnBg: C.teal,
    btnShadow: "none",
    ghostBorder: C.line,
    ghostColor: C.text,
    confetti: [C.teal, C.international, C.amber, C.rose, "#7C5CE0", "#D9852A"],
    sparkles: false
  }
} as const;

function themeFor(gender?: Gender) {
  return gender === "female" ? THEMES.girl : THEMES.simple;
}

/* self-contained canvas confetti burst — no external dependency, runs for a
   few seconds then stops on its own. */
function Confetti({ colors }: { colors: readonly string[] }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener("resize", resize);
    const pieces = Array.from({ length: 150 }, () => ({
      x: Math.random() * canvas.width,
      y: -20 - Math.random() * canvas.height * 0.5,
      w: 6 + Math.random() * 6,
      h: 8 + Math.random() * 8,
      color: colors[Math.floor(Math.random() * colors.length)],
      speed: 1.3 + Math.random() * 2.2,
      drift: (Math.random() - 0.5) * 2.2,
      rotation: Math.random() * 360,
      spin: (Math.random() - 0.5) * 12
    }));
    let raf = 0;
    const start = Date.now();
    const tick = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      pieces.forEach((p) => {
        p.y += p.speed;
        p.x += p.drift;
        p.rotation += p.spin;
        if (p.y > canvas.height + 20) p.y = -20;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      });
      if (Date.now() - start < 9000) raf = requestAnimationFrame(tick);
      else ctx.clearRect(0, 0, canvas.width, canvas.height);
    };
    tick();
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, [colors]);
  return <canvas ref={ref} style={{ position: "fixed", inset: 0, zIndex: 1300, pointerEvents: "none" }} />;
}

// name-based heuristics — the Web Speech API exposes no real gender
// metadata, just voice names, so this is a best-effort match. Never modeled
// on any specific real person, just "sounds like a man" / "sounds like a woman."
const FEMALE_NAME = /female|zira|susan|hazel|samantha|victoria|karen|moira|tessa|fiona|kate|serena|allison|ava|emma|joanna|salli|kendra|kimberly|amy|nicole|olivia|aria|jenny|natasha|catherine|linda|maria|sonia|zoe/i;
const MALE_NAME = /\b(male|david|mark|daniel|alex|fred|george|james|william|guy|ryan|matthew|justin|eric|thomas|oliver|arthur)\b/i;

function pickVoice(voices: SpeechSynthesisVoice[], gender?: Gender): SpeechSynthesisVoice | undefined {
  if (gender === "female") return voices.find((v) => FEMALE_NAME.test(v.name)) || voices[0];
  if (gender === "male") return voices.find((v) => MALE_NAME.test(v.name) && !FEMALE_NAME.test(v.name)) || voices[0];
  return voices[0];
}

// synthesized celebration sound — just a simple, clean ascending "ta-da"
// chime (plain sine tones via the Web Audio API, no audio file to host).
// The noise-based applause/cheer layer was dropped entirely — every version
// of it read as static/an untuned TV channel, so simple and clean beats a
// crackly attempt at something more elaborate. Resolves once it's finished
// playing, so the voice line can start right after instead of overlapping it.
function playCelebrationSound(): Promise<void> {
  return new Promise((resolve) => {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) { resolve(); return; }
    try {
      const ctx = new AC();
      if (ctx.state === "suspended") ctx.resume().catch(() => {});
      const now = ctx.currentTime + 0.02;

      const chime = (time: number, freq: number, duration = 0.32) => {
        const osc = ctx.createOscillator();
        osc.type = "sine";
        osc.frequency.value = freq;
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.35, time + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
        osc.connect(gain).connect(ctx.destination);
        osc.start(time);
        osc.stop(time + duration + 0.02);
      };

      // quick ascending major arpeggio
      const notes = [523.25, 659.25, 784.0, 1046.5]; // C5 E5 G5 C6
      notes.forEach((f, i) => chime(now + i * 0.11, f));
      const chimeEnd = now + notes.length * 0.11 + 0.4;

      const totalMs = (chimeEnd - ctx.currentTime) * 1000;
      setTimeout(() => { resolve(); ctx.close().catch(() => {}); }, Math.max(300, totalMs));
    } catch {
      resolve();
    }
  });
}

export function CongratsModal({ name, hours, tasks, gender, onClose }: {
  name: string; hours: number; tasks: string[]; gender?: Gender; onClose: () => void;
}) {
  const t = themeFor(gender);
  // browser-native text-to-speech — free, offline, no API key. Not the same
  // as a premium neural "AI voice" service (that'd need a paid third-party
  // API), but it's the practical zero-setup option for this.
  const canSpeak = typeof window !== "undefined" && "speechSynthesis" in window;
  const [voiceOn, setVoiceOn] = useState(true);

  useEffect(() => {
    if (!voiceOn) return;
    let cancelled = false;
    const msg = `Congratulations ${name}! You've logged ${fmtHours(hours)} today — a full day's work. ${tasks.length ? `Nice job finishing ${tasks.length} task${tasks.length === 1 ? "" : "s"}.` : ""}`;
    const speak = () => {
      if (cancelled || !canSpeak) return;
      const voice = pickVoice(window.speechSynthesis.getVoices(), gender);
      const utter = new SpeechSynthesisUtterance(msg);
      if (voice) utter.voice = voice;
      utter.rate = 1;
      utter.pitch = gender === "female" ? 1.15 : gender === "male" ? 0.92 : 1;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utter);
    };
    // celebration sound (chime + applause) plays first; the voice line
    // only starts once that's finished, instead of talking over it.
    playCelebrationSound().then(() => {
      if (cancelled || !canSpeak) return;
      // Chrome loads voices asynchronously — the list is often empty on the
      // very first call, so retry once it's populated.
      if (window.speechSynthesis.getVoices().length === 0) {
        window.speechSynthesis.onvoiceschanged = speak;
      } else {
        speak();
      }
    });
    return () => { cancelled = true; if (canSpeak) { window.speechSynthesis.cancel(); window.speechSynthesis.onvoiceschanged = null; } };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voiceOn, gender]);

  return (
    <>
      <Confetti colors={t.confetti} />
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: t.overlay, zIndex: 1200, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
        <div onClick={(e) => e.stopPropagation()} style={{
          background: t.modalBg, borderRadius: 20, maxWidth: 420, width: "100%",
          padding: 26, textAlign: "center", boxShadow: "0 30px 70px rgba(0,0,0,0.3)", border: `1px solid ${t.modalBorder}`
        }}>
          <div className="flex items-center justify-center" style={{ width: t.sparkles ? 68 : 64, height: t.sparkles ? 68 : 64, borderRadius: 999, background: t.iconBg, margin: "0 auto", boxShadow: t.iconShadow }}>
            {t.sparkles ? <Heart size={30} color="#fff" fill="#fff" /> : <PartyPopper size={30} color={C.teal} />}
          </div>
          <div className="flex items-center justify-center gap-1.5" style={{ fontWeight: 800, fontSize: 20, marginTop: 14, color: t.titleColor }}>
            {t.sparkles && <Sparkles size={16} color={t.accentColor} />} Congratulations, {name}! {t.sparkles && <Sparkles size={16} color={t.accentColor} />}
          </div>
          <div style={{ fontSize: 13.5, color: t.bodyColor, opacity: t.sparkles ? 0.75 : 1, marginTop: 4 }}>
            You've logged <b style={{ color: t.accentColor }}>{fmtHours(hours)}</b> today — that's a full day's work. Nicely done.
          </div>

          {tasks.length > 0 && (
            <div style={{ textAlign: "left", background: t.panelBg, borderRadius: 12, padding: 14, marginTop: 16, maxHeight: 220, overflowY: "auto", border: `1px solid ${t.panelBorder}` }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: t.panelLabelColor, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 8 }}>What you accomplished today</div>
              {tasks.map((task, i) => (
                <div key={i} style={{ fontSize: 13, color: t.sparkles ? t.titleColor : C.text, padding: "4px 0", borderTop: i ? `1px solid ${t.panelBorder}` : "none" }}>{t.bullet} {task}</div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-center gap-2" style={{ marginTop: 20 }}>
            <button onClick={onClose} className="font-semibold" style={{
              background: t.btnBg, color: "#fff", border: "none", borderRadius: 10,
              padding: "9px 18px", fontSize: 13.5, cursor: "pointer", boxShadow: t.btnShadow
            }}>Nice, thanks!</button>
            <button onClick={() => setVoiceOn((v) => !v)} className="inline-flex items-center gap-1.5 font-semibold" style={{
              background: "#fff", color: t.ghostColor, border: `1px solid ${t.ghostBorder}`, borderRadius: 10,
              padding: "9px 14px", fontSize: 13, cursor: "pointer"
            }}>
              {voiceOn ? <Volume2 size={13} /> : <VolumeX size={13} />} {voiceOn ? "Sound on" : "Sound off"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
