# Run with:
#   pip install manim
#   manim -pqh anim.py EVChargeLogoAnimation

from manim import *
import numpy as np
import random
import os

LOGO_PATH = os.path.join(os.path.dirname(__file__), "assets", "logo1.png")

NAVY      = "#07091a"
BLUE_MID  = "#3b82f6"
BLUE_LITE = "#93c5fd"
WHITE_ISH = "#e0eeff"


class EVChargeLogoAnimation(Scene):
    def construct(self):
        self.camera.background_color = NAVY

        # ── Assets ────────────────────────────────────────────────────────────
        icon = ImageMobject(LOGO_PATH).scale(3).shift(UP * 0.9)
        icon.set_opacity(0)

        title = Text("EV CHARGE DZ", font_size=54, weight=BOLD, color=WHITE_ISH)
        title.shift(DOWN * 2.3)

        # ── Phase 1 : icon fades in ───────────────────────────────────────────
        self.play(icon.animate.set_opacity(1), run_time=0.7, rate_func=smooth)

        # ── Phase 2 : first electric burst ───────────────────────────────────
        self.play(
            Flash(
                icon.get_center(),
                color=BLUE_MID,
                flash_radius=2.3,
                line_length=0.55,
                num_lines=20,
                run_time=0.35,
            )
        )

        # ── Phase 3 : lightning arcs crackle outward ─────────────────────────
        arcs = self._lightning_arcs(icon.get_center(), count=12)
        self.play(*[Create(a, run_time=0.22) for a in arcs], lag_ratio=0.04)
        self.play(*[FadeOut(a, run_time=0.18) for a in arcs])

        # ── Phase 4 : icon pulse ─────────────────────────────────────────────
        self.play(icon.animate.scale(1.09), run_time=0.2, rate_func=rush_into)
        self.play(icon.animate.scale(1 / 1.09), run_time=0.25, rate_func=rush_from)

        # ── Phase 5 : second softer arc burst ────────────────────────────────
        arcs2 = self._lightning_arcs(icon.get_center(), count=8, r_min=1.1, r_max=2.0)
        self.play(*[Create(a, run_time=0.18) for a in arcs2], lag_ratio=0.06)
        self.play(*[FadeOut(a, run_time=0.15) for a in arcs2])

        # ── Phase 6 : title writes in ─────────────────────────────────────────
        self.play(Write(title, run_time=1.3))

        # ── Phase 7 : sparkle stars pop in ───────────────────────────────────
        stars = self._sparkles(title)
        self.play(*[GrowFromCenter(s, run_time=0.35) for s in stars])

        # ── Phase 8 : final glow flash + hold ────────────────────────────────
        self.play(
            Flash(
                icon.get_center(),
                color=BLUE_LITE,
                flash_radius=1.4,
                line_length=0.28,
                num_lines=14,
                run_time=0.45,
            )
        )
        self.wait(1.5)

    # ── Helpers ───────────────────────────────────────────────────────────────

    def _lightning_arcs(self, center, count=12, r_min=1.5, r_max=3.2):
        bolts = []
        palette = [BLUE_MID, BLUE_LITE, WHITE, "#60a5fa", "#bfdbfe"]
        for i in range(count):
            angle = i * TAU / count + random.uniform(-0.25, 0.25)
            r1 = random.uniform(r_min, r_min + 0.4)
            r2 = random.uniform(r_max - 0.6, r_max)
            end_angle = angle + random.uniform(-0.35, 0.35)

            start = center + r1 * np.array([np.cos(angle), np.sin(angle), 0])
            end   = center + r2 * np.array([np.cos(end_angle), np.sin(end_angle), 0])

            # Build a zigzag path
            pts = [start]
            steps = random.randint(3, 7)
            for j in range(1, steps):
                t = j / steps
                base = start + t * (end - start)
                perp = np.array([-np.sin(angle), np.cos(angle), 0])
                base += perp * random.uniform(-0.18, 0.18)
                pts.append(base)
            pts.append(end)

            bolt = VMobject(
                color=random.choice(palette),
                stroke_width=random.uniform(1.2, 2.8),
                stroke_opacity=random.uniform(0.65, 1.0),
            )
            bolt.set_points_as_corners(pts)
            bolts.append(bolt)
        return bolts

    def _sparkles(self, text):
        offsets = [
            text.get_left()  + LEFT  * 0.45 + UP   * 0.12,
            text.get_right() + RIGHT * 0.45 + UP   * 0.12,
            text.get_left()  + RIGHT * 0.6  + DOWN * 0.38,
            text.get_right() + LEFT  * 0.6  + DOWN * 0.38,
        ]
        stars = []
        for pos in offsets:
            s = Star(
                n=4,
                outer_radius=0.13,
                inner_radius=0.05,
                color=BLUE_LITE,
                fill_opacity=1,
                stroke_width=0,
            )
            s.move_to(pos)
            stars.append(s)
        return stars
