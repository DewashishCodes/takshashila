# Takshashila — Release Asset Production Guide

All image assets needed before publishing. Generate in order: icon → hero → features → social. Save outputs to `media/` at the repo root.

---

## Directory structure

```
media/
  icon/
    icon-1024.png          ← master source
    icon-512.png
    icon-256.png
    icon-128.png
    icon.ico               ← Windows installer (multi-res ICO)
    icon.icns              ← macOS (from icon-512)
  screenshots/
    01-court-floor.png
    02-terminal-active.png
    03-agent-panel.png
    04-onboarding.png
  hero-banner.png          ← 1400×700  README top image
  feature-routing.png      ← 800×500  feature callout
  feature-terminal.png     ← 800×500  feature callout
  social-preview.png       ← 1280×640  GitHub og:image
```

---

## 1. App Icon

**Output:** `media/icon/icon-1024.png`
**Size:** 1024×1024 px, transparent background
**Style:** Pixel art, 64×64 logical grid upscaled 16×, hard edges only (NEAREST neighbor — zero antialiasing), no gradients.

### Generation prompt (Midjourney / DALL-E 3 / Ideogram)

```
Pixel art app icon, 64x64 grid resolution upscaled crisp. Ancient Indian
university building top-down view, stylized single structure with a pointed
stone arch entrance gate, terracotta/brick walls, dusk lighting, warm orange
glow from oil lamps inside the windows, saffron-gold roof trim. Palette
strictly: dark stone #2C1810, gold accent #F4C430, terracotta #C1440E, warm
parchment #F5E6C8, lamp orange #FFB340. Hard pixel edges, no anti-aliasing,
no gradients. Square frame, transparent background. Game icon aesthetic,
retro RPG top-down. Readable at 32px.
```

### Alternative: Sanskrit scroll + AI motif

```
Pixel art icon 64x64 upscaled crisp. Ancient palm-leaf scroll partially
unrolled, glowing circuit-line patterns etched on the leaf in gold, eight
small agent-dot lights arranged in a circle around the scroll center,
each dot a different warm hue. Background: deep dark stone #2C1810.
Gold trim border, square composition. Hard pixel art, no anti-aliasing.
App icon style, transparent background.
```

### Fallback (manual): Aseprite spec

- Canvas: 64×64
- Layer 1: dark stone rectangle fill `#2C1810`
- Layer 2: terracotta arch outline, 2px stroke `#C1440E`
- Layer 3: gold "T" letterform centered (Yatra One style, pixelated), `#F4C430`
- Layer 4: two amber lamp dots flanking, `#FFB340` with 1px orange halo `#C1440E`
- Export: 1024×1024 PNG via nearest-neighbor upscale

### Post-processing

After generating icon-1024.png:
1. `magick icon-1024.png -resize 512x512 -filter Point icon-512.png`
2. `magick icon-1024.png -resize 256x256 -filter Point icon-256.png`
3. `magick icon-1024.png -resize 128x128 -filter Point icon-128.png`
4. Build ICO: `magick icon-16.png icon-32.png icon-48.png icon-256.png icon.ico`
5. Build ICNS: use `iconutil` on macOS or `png2icns` on Windows

Reference these in `electron-builder.yml`:
```yaml
icon: media/icon/icon.ico   # Windows
# icon: media/icon/icon.icns  # macOS
```

---

## 2. Hero Banner

**Output:** `media/hero-banner.png`
**Size:** 1400×700 px
**Style:** Cinematic pixel art scene, slightly wider than app window to give breathing room. This is the top image in the README.

### Generation prompt

```
Wide cinematic pixel art scene 1400x700. Ancient Indian university
interior, top-down isometric-adjacent view. Stone courtyard lit by oil
lamps at dusk. Seven scholar figures seated at wooden desks arranged in
two arcing rows around a large central banyan tree. Each scholar has a
small glowing aura above their workstation. Dark warm stone floor
#2C1810, terracotta/brick perimeter walls, gold lamp glow pools on the
floor, a rangoli pattern in gold and red near the tree base. Bottom-right
corner: one scholar's desk shows a glowing terminal screen in cool blue-
white. Atmosphere: cozy, inhabited, ancient wisdom meets digital work.
Hard pixel art style, dusk palette, no gradients, NEAREST texture.
4:2 wide aspect. No UI chrome, pure scene.
```

### Text overlay (add in Figma / Canva after generation)

```
Font: "Yatra One" (display) + "JetBrains Mono" (tagline)
Title: TAKSHASHILA
       (top-left, 72px, #F4C430, slight text-shadow #2C1810)
Tagline: Multi-agent AI. Ancient wisdom. Modern velocity.
       (below title, 22px, #F5E6C8, JetBrains Mono)
Subtle vignette: radial gradient overlay rgba(44,24,16,0.35) to edges
```

---

## 3. Feature Callout Images

Each is 800×500 px, same pixel art aesthetic, with a thin gold frame border and a one-line caption bar at the bottom.

### 3.1 Routing / Court Floor  (`media/feature-routing.png`)

```
Pixel art top-down courtyard scene 800x500. Seven named scholar agents at
desks, one agent in the center (Chanakya) has a glowing gold status ring
and a visible scroll arc flying from his desk toward another agent
(Bharadwaja). The scroll arc is a dotted yellow line with a tiny rolled
scroll sprite at the tip. Other agents glow dim amber. Stone floor,
warm dusk lighting, oil lamps at each corner. Hard pixel art, no
anti-aliasing. Caption space: 50px dark strip at bottom.
```

Caption text: `Chanakya routes every aadesh — specialists handle the rest`

### 3.2 Terminal / Detail Panel (`media/feature-terminal.png`)

```
Pixel art stylized UI screenshot 800x500. Left 60%: dark stone panel
with a real-looking terminal pane, green-on-dark monospace text, agent
name "Bharadwaja" in gold pixel font at the top of the panel, four tab
labels (Terminal / Files / Git / Smriti) in a parchment-color row.
Right 40%: the court scene in miniature with an avatar glowing working-
blue. Border: 3px gold pixel frame. Warm dark background #2C1810.
Hard pixel art for the decorative elements, the "terminal text" can be
anti-aliased monospace for readability. Dusk atmosphere.
```

Caption text: `Full xterm terminal, file browser, git log, and memory — per agent`

### 3.3 Onboarding (`media/feature-onboarding.png`)

```
Pixel art stylized screenshot 800x500. A centered dialog box with
gold pixel-art border on a blurred stone-courtyard background. Inside
the dialog: step indicators (3 dots, first lit gold), welcome title
"Namaste, Samrat" in Yatra One style, environment check rows showing
green check marks next to "claude ✓", "node ✓", "git ✓". Pixel art
UI controls at the bottom: two gold-outline buttons "SKIP" and
"BEGIN". Warm dark palette throughout. Hard pixel style.
```

Caption text: `One-time setup wizard verifies your environment before the Sabha opens`

---

## 4. Social Preview / GitHub OG Image

**Output:** `media/social-preview.png`
**Size:** 1280×640 px
**Purpose:** GitHub repository social card (Settings → Social preview)

### Generation prompt

```
Wide 1280x640 social preview card. Left half: pixel art ancient Indian
courtyard scene, dusk, scholars at lit desks, warm lamp glow. Right
half: dark stone panel with white/gold text layout. Large title
"TAKSHASHILA" in Yatra One style, gold #F4C430. Below: "Multi-agent
Claude Code harness" in JetBrains Mono, parchment #F5E6C8, 20px.
Below: three small icon+label pairs (pixel icons): "7 AI Agents" /
"Live Terminals" / "Ancient Theme". Dividing line: 2px vertical gold
rule between scene and text panel. Full background: #2C1810. No
external gradients.
```

---

## 5. README Screenshot Sequence

These are actual app screenshots (not generated art). Capture with the app running:

| File | What to capture | App state |
|---|---|---|
| `screenshots/01-court-floor.png` | Full court view, all 7 agents idle, tree centered | Dev mode, all agents spawned |
| `screenshots/02-terminal-active.png` | Chanakya's terminal tab with an aadesh response in progress | Working state |
| `screenshots/03-agent-panel.png` | Bharadwaja's Files tab showing workspace tree + editor | File open in editor |
| `screenshots/04-onboarding.png` | Onboarding wizard step 2 (environment check) | Fresh install |

**Capture spec:**
- Window: 1400×900 px
- DPI: 2× on macOS for retina; 1× on Windows (native 1920×1080)
- Format: PNG, no lossy compression
- Crop: include window chrome (title bar) for authenticity

**Annotation (optional, add in Figma):**
- 3px gold callout arrows pointing to key features
- Font: JetBrains Mono 13px on parchment `#F5E6C8` background tags

---

## 6. Demo GIF / Video

**Output:** `media/demo.gif` (or link to YouTube/Loom)
**Length:** 30–45 seconds
**Script:**

```
0:00  App launches → onboarding wizard appears
0:05  Wizard completes, court floor fades in, agents walk to desks
0:12  User types aadesh: "Research how to use isomorphic-git for commits"
0:15  Chanakya glows, scroll arc flies to Nachiketa
0:20  Nachiketa's terminal lights up, text streams
0:28  Result scroll arc returns to Chanakya
0:33  Chanakya summarizes in the terminal, user reads
0:38  Zoom out to full court, all agents at desks, lamps glowing
```

**Capture tool:** OBS Studio or ShareX (Windows), Kap (macOS)
**GIF conversion:** `ffmpeg -i demo.mp4 -vf "fps=15,scale=1200:-1:flags=lanczos,palettegen" palette.png && ffmpeg -i demo.mp4 -i palette.png -vf "fps=15,scale=1200:-1:flags=lanczos,paletteuse" demo.gif`

---

## 7. Checklist before publishing

- [ ] `media/icon/icon-1024.png` generated + reviewed
- [ ] `media/icon/icon.ico` built (multi-res)
- [ ] `electron-builder.yml` updated with icon path
- [ ] `media/hero-banner.png` generated + text overlay added
- [ ] `media/feature-routing.png` generated
- [ ] `media/feature-terminal.png` generated
- [ ] `media/feature-onboarding.png` generated
- [ ] `media/social-preview.png` generated → uploaded to GitHub Settings
- [ ] `media/screenshots/` — 4 real screenshots captured
- [ ] `media/demo.gif` recorded
- [ ] All media files committed to repo
- [ ] README.md `img` tags updated with correct paths
- [ ] `package.json` `version` bumped to `0.1.0`
- [ ] `CHANGELOG.md` written (optional but good)
