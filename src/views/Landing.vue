<script setup lang="ts">
import { ref } from 'vue'
import { Button } from '@/components/ui/button'
import {
  ArrowRight,
  Check,
  FileText,
  FolderKanban,
  Github,
  Globe2,
  LockKeyhole,
  Presentation,
  Table2,
} from 'lucide-vue-next'

const activeDemo = ref<'forms' | 'sheets' | 'docs'>('forms')

const productPillars = [
  {
    icon: FileText,
    title: 'Docs',
    description: 'Create and edit documents with rich formatting, comments, and Venmail file storage.',
    accent: 'bg-sky-500',
  },
  {
    icon: Table2,
    title: 'Sheets',
    description: 'Work with spreadsheets, formulas, charts, CSV files, and XLSX workbooks.',
    accent: 'bg-emerald-500',
  },
  {
    icon: Presentation,
    title: 'Slides',
    description: 'Build slide decks with themes, speaker notes, reusable layouts, and sharing.',
    accent: 'bg-violet-500',
  },
  {
    icon: FolderKanban,
    title: 'Forms',
    description: 'Build forms, collect responses, configure payments, and manage sharing.',
    accent: 'bg-amber-500',
  },
]

const securityNotes = [
  'Open source foundation',
  'Self-host or managed cloud',
  'Workspace-aware permissions',
]

const goToApp = () => {
  window.location.href = 'https://venia.cloud'
}

const goToLogin = () => {
  window.location.href = '/login?action=login'
}

const goToGithub = () => {
  window.open('https://github.com/venmail/vensuite', '_blank', 'noopener,noreferrer')
}
</script>

<template>
  <main class="landing-shell min-h-screen overflow-hidden bg-[#f7f8f4] text-slate-950">
    <header class="sticky top-0 z-40 border-b border-slate-900/10 bg-[rgba(247,248,244,0.82)] backdrop-blur-xl">
      <div class="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <button class="flex items-center gap-3" type="button" @click="goToApp">
          <img src="/manifest-icon-512.maskable.png" alt="Venmail" class="h-9 w-9 rounded-lg" />
          <div class="text-left leading-tight">
            <span class="block text-sm font-semibold text-slate-500">VENMAIL</span>
            <span class="block text-lg font-bold text-slate-950">Office Suite</span>
          </div>
        </button>

        <nav class="hidden items-center gap-7 text-sm font-medium text-slate-600 md:flex" aria-label="Primary">
          <a href="#workspace" class="transition hover:text-slate-950">Workspace</a>
          <a href="#suite" class="transition hover:text-slate-950">Suite</a>
          <a href="#security" class="transition hover:text-slate-950">Trust</a>
        </nav>

        <div class="flex items-center gap-2">
          <Button variant="ghost" class="hidden text-slate-700 hover:bg-white/70 sm:inline-flex" @click="goToGithub">
            <Github class="mr-2 h-4 w-4" />
            GitHub
          </Button>
          <Button class="bg-slate-950 text-white hover:bg-slate-800" @click="goToLogin">
            Open Suite
            <ArrowRight class="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>

    <section class="relative mx-auto flex max-w-7xl flex-col px-4 pb-14 pt-8 sm:px-6 lg:min-h-[820px] lg:px-8 lg:pt-10">
      <div class="hero-grid" aria-hidden="true"></div>

      <div class="relative z-10 mx-auto max-w-4xl text-center">
        <div class="hero-eyebrow mb-5 inline-flex items-center gap-2 rounded-full border border-slate-900/10 bg-white/80 px-3 py-2 text-slate-700 shadow-sm">
          Office suite for private teams
        </div>

        <h1 class="landing-title mx-auto max-w-4xl text-slate-950">
          Your private office suite.
        </h1>

        <p class="hero-copy mx-auto mt-5 max-w-2xl text-slate-650">
          Documents, spreadsheets, presentations, forms, and more for your team.
        </p>

        <div class="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <Button size="lg" class="h-12 bg-cyan-600 px-6 text-base font-semibold text-white hover:bg-cyan-700" @click="goToLogin">
            <ArrowRight class="mr-2 h-5 w-5" />
            Start in Venmail
          </Button>
          <Button size="lg" variant="outline" class="landing-secondary h-12 border-slate-300 bg-white/75 px-6 text-base font-semibold text-slate-900 hover:bg-white" @click="goToGithub">
            <Github class="mr-2 h-5 w-5" />
            Self-host
          </Button>
        </div>
      </div>

      <div id="workspace" class="relative z-10 mx-auto mt-12 w-full max-w-6xl">
        <div class="workflow-showcase">
          <div class="workflow-bar">
            <span class="workflow-brand"><span class="workflow-mark">V</span> Venia</span>
            <div class="workflow-tabs" aria-label="Workflows">
              <button v-for="demo in (['forms', 'sheets', 'docs'] as const)" :key="demo" type="button" :class="{ selected: activeDemo === demo }" :aria-pressed="activeDemo === demo" @click="activeDemo = demo">{{ demo }}</button>
            </div>
            <span class="workflow-sample">SAMPLE WORKSPACE</span>
          </div>
          <div class="workflow-body">
            <div class="workflow-intro">
              <span class="workflow-kicker">{{ activeDemo === 'forms' ? 'FORMS' : activeDemo === 'sheets' ? 'SHEETS' : 'DOCS' }}</span>
              <h2>{{ activeDemo === 'forms' ? 'Better questions, better answers.' : activeDemo === 'sheets' ? 'Turn numbers into decisions.' : 'Move ideas forward together.' }}</h2>
              <p>{{ activeDemo === 'forms' ? 'Shape each response with conditional questions and calculated fields.' : activeDemo === 'sheets' ? 'Bring formulas and charts to your data.' : 'Write, format, and share work with your team.' }}</p>
              <div class="workflow-tags"><span>{{ activeDemo === 'forms' ? 'Branching' : activeDemo === 'sheets' ? 'Formulas' : 'Rich formatting' }}</span><span>{{ activeDemo === 'forms' ? 'Calculations' : activeDemo === 'sheets' ? 'Charts' : 'Comments' }}</span></div>
            </div>
            <div v-if="activeDemo === 'forms'" class="demo-window form-demo" aria-label="Sample form with a conditional question and calculated total">
              <div class="demo-top"><span class="demo-dot"></span> Project inquiry <span class="demo-status">Preview</span></div>
              <div class="demo-content"><div class="demo-overline">LET’S GET STARTED</div><h3>Tell us about your project</h3><p>What do you need?</p><div class="demo-choice"><span class="choice-radio"></span> Design <span class="choice-check">✓</span></div><div class="demo-reveal"><p>What should we create?</p><div class="demo-input">A new brand identity<span class="demo-cursor"></span></div></div><div class="demo-total"><span>Estimated total</span><strong>$2,400</strong></div></div>
              <div class="demo-rule"><span class="rule-icon">↳</span><span><b>When</b> Design is selected<br><b>Show</b> project details</span><span class="rule-badge">ACTIVE</span></div>
            </div>
            <div v-else-if="activeDemo === 'sheets'" class="demo-window sheet-demo" aria-label="Sample spreadsheet with a total and chart">
              <div class="demo-top"><span class="demo-dot green"></span> Quarterly budget <span class="demo-status">Sheet</span></div>
              <div class="sheet-grid"><span></span><b>A</b><b>B</b><b>C</b><span>1</span><strong>Category</strong><strong>Budget</strong><strong>Actual</strong><span>2</span><label>Design</label><label>$4,000</label><label>$3,600</label><span>3</span><label>Campaign</label><label>$6,000</label><label>$5,800</label><span>4</span><strong>Total</strong><strong>$10,000</strong><strong class="sheet-result">$9,400</strong></div>
              <div class="sheet-formula">ƒx &nbsp; =SUM(C2:C3)</div><div class="sheet-chart"><span></span><span></span><span></span><span></span><span></span></div>
            </div>
            <div v-else class="demo-window doc-demo" aria-label="Sample document with a team comment">
              <div class="demo-top"><span class="demo-dot blue"></span> Project brief <span class="demo-status">Document</span></div><div class="doc-toolbar">B &nbsp; <i>I</i> &nbsp; U &nbsp; | &nbsp; ≡ &nbsp; ☰</div><div class="doc-paper"><div class="demo-overline">PROJECT BRIEF</div><h3>A clearer story for our next chapter.</h3><p>Our goal is to bring the new identity to life across every customer touchpoint.</p><div class="doc-line"></div><div class="doc-line short"></div><div class="doc-comment"><b>AM</b><span>Love this direction ✨</span></div></div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section id="suite" class="border-y border-slate-900/10 bg-white py-16">
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div class="mb-10 flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <p class="text-sm font-extrabold uppercase text-cyan-700">One suite</p>
            <h2 class="section-title mt-3 max-w-2xl text-slate-950">
              The tools your team needs.
            </h2>
          </div>

        </div>

        <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <article v-for="pillar in productPillars" :key="pillar.title" class="suite-card">
            <div class="mb-6 flex items-center justify-between">
              <div class="flex h-11 w-11 items-center justify-center rounded-lg bg-slate-100">
                <component :is="pillar.icon" class="h-6 w-6 text-slate-900" />
              </div>
              <span :class="['h-3 w-3 rounded-full', pillar.accent]"></span>
            </div>
            <h3 class="text-xl font-extrabold text-slate-950">{{ pillar.title }}</h3>
            <p class="mt-3 text-sm leading-6 text-slate-600">{{ pillar.description }}</p>
          </article>
        </div>
      </div>
    </section>

    <section id="security" class="bg-[#eef5f1] py-16">
      <div class="mx-auto grid max-w-7xl gap-8 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
        <div>
          <p class="text-sm font-extrabold uppercase text-emerald-700">Trust model</p>
          <h2 class="section-title mt-3 text-slate-950">The office suite should stay under your control.</h2>
          <p class="mt-5 text-base leading-7 text-slate-650">
            Venmail Office keeps work tied to workspace access and deployment choice, so teams can move quickly without losing ownership of their tools.
          </p>
        </div>

        <div class="grid gap-4 sm:grid-cols-3">
          <div v-for="note in securityNotes" :key="note" class="rounded-lg border border-slate-900/10 bg-white p-5 shadow-sm">
            <div class="mb-5 flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50">
              <Check class="h-5 w-5 text-emerald-700" />
            </div>
            <p class="font-bold leading-6 text-slate-850">{{ note }}</p>
          </div>
        </div>
      </div>
    </section>

    <section class="bg-slate-950 px-4 py-16 text-white sm:px-6 lg:px-8">
      <div class="mx-auto grid max-w-7xl items-center gap-8 md:grid-cols-[1fr_auto]">
        <div>
          <div class="mb-5 flex items-center gap-3 text-sm font-bold text-cyan-300">
            <LockKeyhole class="h-5 w-5" />
            <span>Private by default, built for daily work</span>
          </div>
          <h2 class="section-title max-w-3xl">Make space for your best work.</h2>
        </div>
        <div class="flex flex-col gap-3 sm:flex-row">
          <Button size="lg" class="h-12 bg-cyan-500 px-6 text-base font-semibold text-slate-950 hover:bg-cyan-400" @click="goToLogin">
            Open Suite
            <ArrowRight class="ml-2 h-5 w-5" />
          </Button>
          <Button size="lg" variant="outline" class="h-12 border-white/25 bg-white/10 px-6 text-base font-semibold text-white hover:bg-white hover:text-slate-950" @click="goToGithub">
            <Globe2 class="mr-2 h-5 w-5" />
            Deploy your way
          </Button>
        </div>
      </div>
    </section>

    <footer class="bg-slate-950 px-4 pb-10 text-white sm:px-6 lg:px-8">
      <div class="mx-auto flex max-w-7xl flex-col justify-between gap-4 border-t border-white/10 pt-8 text-sm text-slate-400 md:flex-row md:items-center">
        <p>Copyright 2026 Venmail Office Suite.</p>
        <div class="flex flex-wrap gap-5">
          <a href="#workspace" class="hover:text-white">Workspace</a>
          <a href="#suite" class="hover:text-white">Suite</a>
          <button type="button" class="hover:text-white" @click="goToGithub">Open source</button>
        </div>
      </div>
    </footer>
  </main>
</template>

<style scoped>
.landing-secondary { color: #0f172a !important; background: #fff !important; }

.landing-shell {
  --grid-line: rgba(15, 23, 42, 0.08);
}

.hero-grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(var(--grid-line) 1px, transparent 1px),
    linear-gradient(90deg, var(--grid-line) 1px, transparent 1px);
  background-size: 48px 48px;
  mask-image: linear-gradient(to bottom, black, transparent 88%);
}

.text-slate-650 {
  color: #475569;
}

.text-slate-850 {
  color: #172033;
}

.landing-title,
.section-title {
  font-family: Onest, Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  font-weight: 720;
  letter-spacing: 0;
}

.landing-title {
  font-size: 2.75rem;
  line-height: 1.08;
}

.section-title {
  font-size: 2rem;
  line-height: 1.18;
}

.hero-eyebrow {
  font-size: 0.875rem;
  font-weight: 650;
  line-height: 1.25rem;
}

.hero-copy {
  font-size: 1.0625rem;
  line-height: 1.75rem;
  font-weight: 400;
}

.suite-visual {
  overflow: hidden;
  border: 1px solid rgba(15, 23, 42, 0.12);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.82);
  box-shadow: 0 28px 80px rgba(15, 23, 42, 0.16);
  backdrop-filter: blur(18px);
}

.suite-visual-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  border-bottom: 1px solid rgba(15, 23, 42, 0.1);
  background: rgba(248, 250, 252, 0.86);
  padding: 0.9rem 1rem;
}

.suite-visual-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 1rem;
  padding: 1rem;
}

.suite-visual-card {
  position: relative;
  min-height: 220px;
  overflow: hidden;
  border: 1px solid rgba(15, 23, 42, 0.1);
  border-radius: 0.75rem;
  background: #ffffff;
  padding: 1.25rem;
  box-shadow: 0 8px 28px rgba(15, 23, 42, 0.06);
}

.suite-visual-accent {
  position: absolute;
  right: 1rem;
  top: 1rem;
  height: 0.75rem;
  width: 0.75rem;
  border-radius: 999px;
}

 .workflow-showcase{overflow:hidden;border:1px solid #dbe3df;border-radius:20px;background:#fff;box-shadow:0 28px 80px rgba(15,23,42,.14)}
.workflow-bar{display:flex;align-items:center;gap:2rem;padding:14px 22px;border-bottom:1px solid #e8eeeb}.workflow-brand{display:flex;align-items:center;gap:8px;font-weight:750}.workflow-mark{display:grid;place-items:center;width:26px;height:26px;border-radius:8px;background:#0f766e;color:white}.workflow-tabs{display:flex;gap:5px}.workflow-tabs button{padding:7px 12px;border-radius:8px;color:#64748b;font-size:13px;font-weight:650;text-transform:capitalize}.workflow-tabs button:hover,.workflow-tabs button.selected{background:#e8f5f1;color:#0f766e}.workflow-tabs button:focus-visible{outline:2px solid #0d9488;outline-offset:2px}.workflow-sample{margin-left:auto;font-size:10px;letter-spacing:.13em;color:#94a3b8;font-weight:700}
.workflow-body{display:grid;grid-template-columns:.8fr 1.2fr;align-items:center;gap:3rem;min-height:410px;padding:45px 6%;background:radial-gradient(circle at 80% 55%,#d8f1e9,transparent 42%),#f7faf8}.workflow-intro h2{margin-top:14px;max-width:360px;font-size:2rem;font-weight:750;line-height:1.13;letter-spacing:-.03em}.workflow-intro p{margin-top:14px;max-width:330px;color:#64748b;line-height:1.7}.workflow-kicker,.demo-overline{font-size:10px;letter-spacing:.14em;font-weight:800;color:#0f766e}.workflow-tags{display:flex;flex-wrap:wrap;gap:8px;margin-top:22px}.workflow-tags span{border:1px solid #cfe4db;border-radius:99px;background:#fff;padding:6px 10px;font-size:11px;font-weight:700;color:#41655a}
.demo-window{position:relative;min-height:310px;border:1px solid #dce5e1;border-radius:13px;background:white;box-shadow:0 16px 40px #2851471c;animation:demo-enter .45s ease both}.demo-top{display:flex;align-items:center;gap:9px;padding:13px 16px;border-bottom:1px solid #edf1ef;font-size:12px;font-weight:700}.demo-dot{width:9px;height:9px;border-radius:50%;background:#fbbf24}.demo-dot.green{background:#34d399}.demo-dot.blue{background:#38bdf8}.demo-status{margin-left:auto;color:#94a3b8;font-size:10px}.demo-content{padding:24px 28px}.demo-content h3,.doc-paper h3{margin-top:6px;font-size:18px;font-weight:750;color:#1e293b}.demo-content p{margin:16px 0 7px;font-size:11px;font-weight:700;color:#475569}.demo-choice,.demo-input{border:1px solid #d8e4df;border-radius:7px;padding:9px 11px;font-size:11px;color:#334155}.demo-choice{display:flex;align-items:center;gap:8px;border-color:#85c6b1;background:#f4fbf8}.choice-radio{width:12px;height:12px;border:4px solid #0d9488;border-radius:50%}.choice-check{margin-left:auto;color:#0d9488}.demo-reveal{animation:reveal 5s ease infinite}.demo-cursor{display:inline-block;height:12px;margin-left:3px;border-left:1px solid #0d9488;vertical-align:middle;animation:blink 1s step-end infinite}.demo-total{display:flex;justify-content:space-between;margin-top:17px;font-size:11px;color:#64748b}.demo-total strong{color:#0f766e}.demo-rule{position:absolute;right:-18px;top:95px;display:flex;align-items:center;gap:10px;padding:11px 13px;border:1px solid #dbebe4;border-radius:10px;background:white;box-shadow:0 8px 25px #194f3820;color:#64748b;font-size:10px;line-height:1.6;animation:float-rule 5s ease-in-out infinite}.demo-rule b{color:#334155}.rule-icon{font-size:21px;color:#0d9488}.rule-badge{font-size:8px;font-weight:800;color:#0f766e}
.sheet-grid{display:grid;grid-template-columns:25px repeat(3,1fr);margin:24px 26px 0;font-size:10px;color:#64748b}.sheet-grid>*{padding:8px 6px;border:1px solid #eef2f0}.sheet-grid b,.sheet-grid>span{background:#f7faf8;text-align:center}.sheet-grid strong{color:#334155}.sheet-result{background:#e1f6ec;animation:highlight 4s ease infinite}.sheet-formula{margin:12px 26px;font-size:11px;color:#0f766e}.sheet-chart{position:absolute;right:38px;bottom:26px;display:flex;align-items:end;gap:8px;height:55px}.sheet-chart span{width:15px;height:50%;border-radius:4px 4px 0 0;background:#5ac9a8;animation:bars 2s ease both}.sheet-chart span:nth-child(2){height:75%}.sheet-chart span:nth-child(3){height:55%}.sheet-chart span:nth-child(4){height:90%}.sheet-chart span:nth-child(5){height:70%}.doc-toolbar{padding:10px 20px;border-bottom:1px solid #edf1ef;font-size:12px;color:#64748b}.doc-paper{position:relative;margin:20px 14%;padding:18px 20px 35px;box-shadow:0 4px 20px #0f172a12}.doc-paper p{margin-top:14px;font-size:11px;line-height:1.7;color:#64748b}.doc-line{height:5px;margin-top:12px;border-radius:5px;background:#edf2f1}.doc-line.short{width:65%}.doc-comment{position:absolute;right:-40px;bottom:0;display:flex;align-items:center;gap:7px;padding:8px;border-radius:8px;background:white;box-shadow:0 5px 20px #0f172a20;font-size:10px;animation:float-rule 5s ease-in-out infinite}.doc-comment b{display:grid;place-items:center;width:23px;height:23px;border-radius:50%;background:#d9f3eb;color:#0f766e;font-size:8px}
@keyframes demo-enter{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}@keyframes reveal{0%,12%{opacity:.25;transform:translateY(-4px)}25%,85%{opacity:1;transform:none}100%{opacity:.25}}@keyframes float-rule{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}@keyframes blink{50%{opacity:0}}@keyframes highlight{50%{background:#b5ecd3}}@keyframes bars{from{transform:scaleY(.2);transform-origin:bottom}to{transform:scaleY(1);transform-origin:bottom}}
@media(max-width:700px){.workflow-bar{gap:10px;padding:12px}.workflow-sample{display:none}.workflow-tabs{margin-left:auto}.workflow-tabs button{padding:7px 8px}.workflow-body{grid-template-columns:1fr;gap:24px;padding:28px 20px 35px}.workflow-intro h2{font-size:1.6rem}.demo-rule{position:static;margin:0 18px 18px;box-shadow:none}.doc-comment{right:-20px}}
@media(prefers-reduced-motion:reduce){.demo-window,.demo-reveal,.demo-cursor,.demo-rule,.doc-comment,.sheet-result,.sheet-chart span{animation:none}}

.suite-card {
  min-height: 240px;
  border: 1px solid rgba(15, 23, 42, 0.1);
  border-radius: 0.75rem;
  background: #ffffff;
  padding: 1.25rem;
  box-shadow: 0 8px 28px rgba(15, 23, 42, 0.06);
  transition: transform 160ms ease, border-color 160ms ease, box-shadow 160ms ease;
}

.suite-card:hover {
  border-color: rgba(8, 145, 178, 0.28);
  box-shadow: 0 18px 42px rgba(15, 23, 42, 0.1);
  transform: translateY(-3px);
}

@media (max-width: 900px) {
  .suite-visual-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .suite-visual {
    border-radius: 14px;
  }

  .suite-visual-grid {
    grid-template-columns: 1fr;
  }
}

@media (min-width: 1024px) {
  .landing-title {
    font-size: 4rem;
    line-height: 1;
  }

  .section-title {
    font-size: 2.75rem;
    line-height: 1.18;
  }

  .hero-copy {
    font-size: 1.125rem;
    line-height: 1.75rem;
  }
}
</style>
