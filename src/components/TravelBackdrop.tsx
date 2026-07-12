import { Plane, Cloud, Globe2, MapPin } from "lucide-react";
import { C } from "../lib/theme";

/* Fixed, full-viewport decorative wash: soft pastel gradient + blurred color
   blobs + a handful of faint travel motifs. Sits behind all content
   (pointer-events: none, negative-ish z-index) so it never affects
   readability or interaction. */
export function TravelBackdrop() {
  return (
    <div aria-hidden style={{ position: "fixed", inset: 0, zIndex: 0, overflow: "hidden", pointerEvents: "none" }}>
      <div style={{
        position: "absolute", inset: 0,
        background: `linear-gradient(135deg, ${C.skyBlueSoft} 0%, #F6F7FC 30%, ${C.peachSoft} 65%, ${C.mintSoft} 100%)`
      }} />
      <div style={{ position: "absolute", top: -120, left: -100, width: 420, height: 420, borderRadius: "50%", background: C.skyBlue, opacity: 0.35, filter: "blur(90px)" }} />
      <div style={{ position: "absolute", top: 120, right: -140, width: 480, height: 480, borderRadius: "50%", background: C.peach, opacity: 0.3, filter: "blur(100px)" }} />
      <div style={{ position: "absolute", bottom: -160, left: "30%", width: 460, height: 460, borderRadius: "50%", background: C.mint, opacity: 0.3, filter: "blur(100px)" }} />
      <div style={{ position: "absolute", bottom: 40, right: "10%", width: 320, height: 320, borderRadius: "50%", background: C.lavender, opacity: 0.25, filter: "blur(80px)" }} />

      <svg style={{ position: "absolute", top: "18%", left: "8%", opacity: 0.14 }} width="220" height="120" viewBox="0 0 220 120" fill="none">
        <path d="M2 100 C 60 20, 160 20, 218 90" stroke={C.international} strokeWidth="2" strokeDasharray="6 8" />
      </svg>
      <Plane size={46} color={C.international} style={{ position: "absolute", top: "16%", left: "6%", opacity: 0.16, transform: "rotate(35deg)" }} />
      <Cloud size={64} color={C.ink} style={{ position: "absolute", top: "8%", right: "22%", opacity: 0.1 }} />
      <Cloud size={40} color={C.ink} style={{ position: "absolute", top: "60%", left: "16%", opacity: 0.08 }} />
      <Globe2 size={90} color={C.teal} style={{ position: "absolute", bottom: "10%", right: "6%", opacity: 0.1 }} />
      <MapPin size={34} color={C.domestic} style={{ position: "absolute", bottom: "26%", left: "44%", opacity: 0.12 }} />
    </div>
  );
}
