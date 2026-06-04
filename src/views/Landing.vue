<script setup lang="ts">
import { Button } from '@/components/ui/button'
import {
  ArrowRight,
  Bot,
  BrainCircuit,
  Check,
  FileText,
  FolderKanban,
  Github,
  Globe2,
  LockKeyhole,
  Presentation,
  Sparkles,
  Table2,
  WandSparkles,
} from 'lucide-vue-next'

const productPillars = [
  {
    icon: FileText,
    title: 'Docs',
    description: 'Structured writing, rich layouts, comments, PDF import, and AI drafting in one canvas.',
    accent: 'bg-sky-500',
  },
  {
    icon: Table2,
    title: 'Sheets',
    description: 'Fast workbooks with formulas, charts, analysis, and data-ready collaboration.',
    accent: 'bg-emerald-500',
  },
  {
    icon: Presentation,
    title: 'Slides',
    description: 'Turn ideas into polished decks with themes, speaker flow, and reusable visual systems.',
    accent: 'bg-violet-500',
  },
  {
    icon: FolderKanban,
    title: 'Forms',
    description: 'Collect responses, payments, signatures, and approvals without sending work elsewhere.',
    accent: 'bg-amber-500',
  },
]

const aiActions = [
  'Draft launch memo from last week files',
  'Build a dashboard from Q2 sheets',
  'Summarize contract risks before signing',
  'Create a client-ready proposal deck',
]

const workspaceSignals = [
  { label: 'Live docs', value: '38' },
  { label: 'AI tasks done', value: '126' },
  { label: 'Shared rooms', value: '12' },
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
          <Sparkles class="h-4 w-4 text-cyan-600" />
          AI-first office, built for private teams
        </div>

        <h1 class="landing-title mx-auto max-w-4xl text-slate-950">
          Your AI office suite.
        </h1>

        <p class="hero-copy mx-auto mt-5 max-w-2xl text-slate-650">
          Documents, sheets, slides, forms, signing, media, and file rooms in one intelligent workspace where AI understands context and helps work move faster.
        </p>

        <div class="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <Button size="lg" class="h-12 bg-cyan-600 px-6 text-base font-semibold text-white hover:bg-cyan-700" @click="goToLogin">
            <WandSparkles class="mr-2 h-5 w-5" />
            Start in Venmail
          </Button>
          <Button size="lg" variant="outline" class="h-12 border-slate-300 bg-white/75 px-6 text-base font-semibold text-slate-900 hover:bg-white" @click="goToGithub">
            <Github class="mr-2 h-5 w-5" />
            Self-host
          </Button>
        </div>

        <div class="mx-auto mt-8 grid max-w-xl grid-cols-3 gap-3">
          <div v-for="signal in workspaceSignals" :key="signal.label" class="rounded-lg border border-slate-900/10 bg-white/70 p-4 shadow-sm">
            <div class="text-2xl font-extrabold text-slate-950">{{ signal.value }}</div>
            <div class="mt-1 text-xs font-semibold uppercase text-slate-500">{{ signal.label }}</div>
          </div>
        </div>
      </div>

      <div id="workspace" class="relative z-10 mx-auto mt-12 w-full max-w-6xl">
        <div class="office-frame">
          <div class="office-topbar">
            <div class="flex items-center gap-2">
              <span class="h-3 w-3 rounded-full bg-rose-400"></span>
              <span class="h-3 w-3 rounded-full bg-amber-400"></span>
              <span class="h-3 w-3 rounded-full bg-emerald-400"></span>
            </div>
            <div class="hidden rounded-full bg-white px-4 py-1.5 text-xs font-semibold text-slate-500 shadow-sm sm:block">
              venmail.office/boardroom
            </div>
          </div>

          <div class="office-body">
            <aside class="office-sidebar">
              <div class="mb-5 flex items-center gap-2 rounded-lg bg-slate-950 px-3 py-2 text-sm font-semibold text-white">
                <Bot class="h-4 w-4 text-cyan-300" />
                AI Command
              </div>
              <div class="space-y-2">
                <button v-for="action in aiActions" :key="action" class="ai-action" type="button">
                  <Sparkles class="h-4 w-4 text-cyan-600" />
                  <span>{{ action }}</span>
                </button>
              </div>
            </aside>

            <section class="office-canvas">
              <div class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p class="text-xs font-bold uppercase text-cyan-700">Today workspace</p>
                  <h2 class="mt-1 text-2xl font-extrabold text-slate-950">Launch room</h2>
                </div>
                <div class="flex items-center gap-2 rounded-full bg-white px-3 py-2 text-xs font-bold text-slate-600 shadow-sm">
                  <span class="h-2 w-2 rounded-full bg-emerald-500"></span>
                  7 collaborators live
                </div>
              </div>

              <div class="grid gap-3 lg:grid-cols-[1.35fr_0.65fr]">
                <div class="rounded-lg border border-slate-900/10 bg-white p-4 shadow-sm">
                  <div class="mb-4 flex items-center justify-between">
                    <div class="flex items-center gap-2 font-bold text-slate-800">
                      <FileText class="h-5 w-5 text-sky-600" />
                      Investor memo
                    </div>
                    <span class="rounded-full bg-sky-50 px-2.5 py-1 text-xs font-bold text-sky-700">AI drafted</span>
                  </div>
                  <div class="space-y-2">
                    <span class="block h-3 w-11/12 rounded-full bg-slate-200"></span>
                    <span class="block h-3 w-10/12 rounded-full bg-slate-200"></span>
                    <span class="block h-3 w-8/12 rounded-full bg-slate-200"></span>
                  </div>
                  <div class="mt-5 grid grid-cols-3 gap-2">
                    <div class="h-16 rounded-lg bg-cyan-50 p-3">
                      <span class="block h-2 w-10 rounded-full bg-cyan-500"></span>
                      <span class="mt-3 block h-2 w-16 rounded-full bg-cyan-200"></span>
                    </div>
                    <div class="h-16 rounded-lg bg-amber-50 p-3">
                      <span class="block h-2 w-12 rounded-full bg-amber-500"></span>
                      <span class="mt-3 block h-2 w-14 rounded-full bg-amber-200"></span>
                    </div>
                    <div class="h-16 rounded-lg bg-violet-50 p-3">
                      <span class="block h-2 w-8 rounded-full bg-violet-500"></span>
                      <span class="mt-3 block h-2 w-16 rounded-full bg-violet-200"></span>
                    </div>
                  </div>
                </div>

                <div class="grid gap-3">
                  <div class="rounded-lg border border-slate-900/10 bg-[#10212b] p-4 text-white shadow-sm">
                    <div class="flex items-center gap-2 text-sm font-bold">
                      <BrainCircuit class="h-5 w-5 text-cyan-300" />
                      Agent brief
                    </div>
                    <p class="mt-3 text-sm leading-6 text-slate-200">Summarized 14 docs, found 3 open tasks, prepared a review deck.</p>
                  </div>
                  <div class="rounded-lg border border-slate-900/10 bg-white p-4 shadow-sm">
                    <div class="flex items-center gap-2 text-sm font-bold text-slate-800">
                      <Table2 class="h-5 w-5 text-emerald-600" />
                      Growth model
                    </div>
                    <div class="mt-4 flex items-end gap-2">
                      <span class="h-10 w-8 rounded-t-md bg-emerald-200"></span>
                      <span class="h-16 w-8 rounded-t-md bg-emerald-400"></span>
                      <span class="h-12 w-8 rounded-t-md bg-cyan-300"></span>
                      <span class="h-20 w-8 rounded-t-md bg-slate-800"></span>
                    </div>
                  </div>
                </div>
              </div>
            </section>
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
              Every work surface gets an AI-native upgrade.
            </h2>
          </div>
          <p class="max-w-xl text-base leading-7 text-slate-600">
            A modern office suite should feel unified: files, canvases, data, media, and approvals move through the same intelligent layer.
          </p>
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
          <h2 class="section-title mt-3 text-slate-950">AI should make the office faster, not leakier.</h2>
          <p class="mt-5 text-base leading-7 text-slate-650">
            Venmail Office keeps the AI experience tied to workspace permissions and deployment choice, so teams can move fast without giving up control.
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
            <span>Private by default, dazzling by design</span>
          </div>
          <h2 class="section-title max-w-3xl">Bring the Venmail office suite into the era of contextual AI.</h2>
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

.office-frame {
  overflow: hidden;
  border: 1px solid rgba(15, 23, 42, 0.12);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.8);
  box-shadow: 0 28px 80px rgba(15, 23, 42, 0.18);
}

.office-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  border-bottom: 1px solid rgba(15, 23, 42, 0.1);
  background: rgba(248, 250, 252, 0.85);
  padding: 0.85rem 1rem;
}

.office-body {
  display: grid;
  grid-template-columns: 240px minmax(0, 1fr);
  min-height: 430px;
}

.office-sidebar {
  border-right: 1px solid rgba(15, 23, 42, 0.1);
  background: #f8fafc;
  padding: 1rem;
}

.ai-action {
  display: flex;
  width: 100%;
  align-items: flex-start;
  gap: 0.65rem;
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 0.65rem;
  background: white;
  padding: 0.75rem;
  text-align: left;
  font-size: 0.8125rem;
  font-weight: 700;
  line-height: 1.35;
  color: #334155;
  transition: transform 160ms ease, border-color 160ms ease, box-shadow 160ms ease;
}

.ai-action:hover {
  border-color: rgba(8, 145, 178, 0.35);
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08);
  transform: translateY(-1px);
}

.office-canvas {
  min-width: 0;
  background:
    linear-gradient(135deg, rgba(14, 165, 233, 0.1), transparent 34%),
    linear-gradient(225deg, rgba(245, 158, 11, 0.12), transparent 30%),
    #f3f6f4;
  padding: 1rem;
}

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
  .office-body {
    grid-template-columns: 1fr;
  }

  .office-sidebar {
    border-right: 0;
    border-bottom: 1px solid rgba(15, 23, 42, 0.1);
  }
}

@media (max-width: 640px) {
  .office-frame {
    border-radius: 14px;
  }

  .office-body {
    min-height: auto;
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
