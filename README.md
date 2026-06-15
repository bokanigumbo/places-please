# places please 🎭

a theatre run sheet generator i built for my portfolio. if you've ever had to manage a show, you know how chaotic run sheets get — i wanted something that actually works the way a DSM thinks.

i've produced two shows at uni so i knew exactly what was missing from every google doc template i'd ever used.

---

## what it does

- build a run sheet for any show — play, musical, whatever
- add scenes with cast, duration, cue types (LX, SQ, FLY, pyro etc) and hazard flags
- organise scenes into acts with per-act runtimes
- drag to reorder scenes
- automatic total runtime + estimated end time from curtain up
- **calling mode** — full screen, big text view for actually running the show
- **wings view** — who's on stage, who needs to be in the wings, what's coming next
- hazard flags (pyro, strobe, fog, flying, live flame, firearms) with red visual treatment so you can't miss them
- save multiple shows — everything persists in localStorage
- colour-coded cue types by department
- dark/light toggle
- prints cleanly

---

## tech stack

- react (vite)
- plain css — no component library
- localStorage for persistence
- no backend, no dependencies beyond react itself

---

## running it locally

```bash
git clone https://github.com/yourusername/places-please.git
cd places-please
npm install
npm run dev
```

that's it. no env files, no api keys, nothing to configure.

---

## why i built this

i'm a cs student at the university of liverpool and i also produce theatre. i wanted a project that came from a real problem i actually have — not a tutorial clone.

every show i've done, the run sheet lives in a google doc that breaks under pressure. this doesn't.

---

## screenshots

*coming soon*

---

made by bokani
