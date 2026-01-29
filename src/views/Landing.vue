<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Calendar, 
  FileText, 
  Users, 
  TrendingUp, 
  Shield, 
  ArrowRight,
  Check,
  Star,
  Zap,
} from 'lucide-vue-next'
import { GithubLogoIcon } from '@radix-icons/vue'
import { t } from '@/i18n';

const features = [
  {
    icon: FileText,
    title: 'Documents',
    description: t('Views.text.rich_text_editor_with')
  },
  {
    icon: TrendingUp,
    title: 'Sheets',
    description: 'Powerful spreadsheets with formulas, charts, and data analysis'
  },
  {
    icon: Calendar,
    title: 'Forms',
    description: t('Views.text.build_surveys_and_collect')
  },
  {
    icon: Users,
    title: t('Commons.heading.slides'),
    description: t('Views.text.create_presentations_with_templates')
  }
]

const benefits = [
  '100% open source',
  'Self-hosted option',
  'No vendor lock-in',
  'Privacy-focused',
  'Community driven',
  'Free forever option'
]

const goToApp = () => {
  window.location.href = 'https://venia.cloud'
}

const goToLogin = () => {
  window.location.href = '/login?action=login'
}

const goToGithub = () => {
  window.open('https://github.com/venmail/vensuite', '_blank')
}
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-primary-50 to-orange-100 dark:from-gray-900 dark:to-gray-800 transition-colors">
    <!-- Header -->
    <header class="border-b bg-white/80 backdrop-blur-sm dark:bg-gray-900/80 dark:border-gray-700 transition-colors">
      <div class="container mx-auto px-4 py-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-2">
            <div class="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center">
              <FileText class="w-5 h-5 text-white" />
            </div>
            <span class="text-xl font-bold text-gray-900 dark:text-white transition-colors">{{$t('Commons.text.venmail_drive')}}</span>
            <Badge variant="secondary" class="text-xs">
              <GithubLogoIcon class="w-3 h-3 mr-1" />
              {{$t('Commons.text.open_source')}}
            </Badge>
          </div>
          <div class="flex items-center space-x-4">
            <Button @click="goToLogin" class="bg-primary-600 hover:bg-primary-700 px-6">
              {{$t('Commons.button.login')}}
              <ArrowRight class="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    </header>

    <!-- Hero Section -->
    <section class="py-20 px-4">
      <div class="container mx-auto text-center">
        <div class="inline-flex items-center space-x-2 bg-primary-100 text-primary-800 dark:bg-primary-900/30 dark:text-primary-300 px-4 py-2 rounded-full text-sm font-medium mb-6 transition-colors">
          <Shield class="w-4 h-4" />
          <span>{{$t('Views.text.privacy_first_productivity_suite')}}</span>
        </div>
        
        <h1 class="text-4xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6 transition-colors">
          {{$t('Commons.heading.your_workspace')}}
          <br />
          <span class="text-transparent bg-clip-text bg-gradient-to-r from-primary-500 to-primary-600">
            {{$t('Commons.text.your_rules')}}
          </span>
        </h1>
        
        <p class="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto transition-colors">
          Complete open-source productivity suite with documents, spreadsheets, forms, and presentations. 
          Self-hosted or use our managed service. No tracking, no ads, just pure productivity.
        </p>
        
        <div class="flex flex-col sm:flex-row gap-6 justify-center mb-12">
          <Button size="lg" @click="goToLogin" class="text-lg px-8 py-4 bg-primary-600 hover:bg-primary-700 shadow-lg hover:shadow-xl transition-all duration-200">
            <Zap class="w-6 h-6 mr-3" />
            {{$t('Views.button.try_it_on_venmail')}}
          </Button>
          <Button size="lg" variant="outline" @click="goToGithub" class="text-lg px-8 py-4 border-2 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-200">
            <GithubLogoIcon class="w-6 h-6 mr-3" />
            {{$t('Commons.button.self_host')}}
          </Button>
        </div>

        <div class="flex items-center justify-center space-x-8 text-sm text-gray-500 dark:text-gray-400 transition-colors">
          <div class="flex items-center">
            <Star class="w-4 h-4 text-yellow-500 mr-1" />
            <span>10,000+ GitHub stars</span>
          </div>
          <div class="flex items-center">
            <Users class="w-4 h-4 text-green-500 mr-1" />
            <span>5,000+ active users</span>
          </div>
          <div class="flex items-center">
            <Shield class="w-4 h-4 text-blue-500 mr-1" />
            <span>{{$t('Views.text.100_open_source')}}</span>
          </div>
        </div>
      </div>
    </section>

    <!-- Features Grid -->
    <section class="py-20 px-4 bg-white dark:bg-gray-800 transition-colors">
      <div class="container mx-auto">
        <div class="text-center mb-16">
          <h2 class="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4 transition-colors">
            {{$t('Views.heading.everything_you_need_to')}}
          </h2>
          <p class="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto transition-colors">
            All the essential productivity tools, built with privacy and collaboration in mind
          </p>
        </div>
        
        <div class="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card v-for="feature in features" :key="feature.title" class="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div class="w-12 h-12 bg-gradient-to-br from-primary-100 to-orange-100 dark:from-primary-900/30 dark:to-primary-800/30 rounded-lg flex items-center justify-center mb-4 transition-colors">
                <component :is="feature.icon" class="w-6 h-6 text-primary-600 dark:text-primary-400 transition-colors" />
              </div>
              <CardTitle class="text-lg">{{ feature.title }}</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription class="text-gray-600 dark:text-gray-300 transition-colors">
                {{ feature.description }}
              </CardDescription>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>

    <!-- Screenshot Showcase -->
    <section class="py-20 px-4 bg-gray-50 dark:bg-gray-900 transition-colors">
      <div class="container mx-auto">
        <div class="text-center mb-16">
          <h2 class="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4 transition-colors">
            See It in Action
          </h2>
          <p class="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto transition-colors">
            Experience the power of modern productivity tools with AI-powered features and beautiful interfaces
          </p>
        </div>
        
        <div class="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          <!-- AI Form Creation -->
          <div class="group relative">
            <div class="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-xl"></div>
            <div class="relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-200 dark:border-gray-700">
              <div class="absolute top-4 left-4 z-10">
                <div class="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-3 py-1 rounded-full text-xs font-semibold">
                  AI Powered
                </div>
              </div>
              <div class="p-4">
                <img 
                  src="/form-ai.png" 
                  alt="AI Form Creation" 
                  class="w-full h-64 object-cover rounded-lg"
                />
                <div class="mt-4">
                  <h3 class="text-lg font-bold text-gray-900 dark:text-white mb-2">AI Form Builder</h3>
                  <p class="text-sm text-gray-600 dark:text-gray-300">Create beautiful forms instantly with AI. Just describe what you need and watch the magic happen.</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Document Editor -->
          <div class="group relative">
            <div class="absolute inset-0 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-xl"></div>
            <div class="relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-200 dark:border-gray-700">
              <div class="absolute top-4 left-4 z-10">
                <div class="bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-3 py-1 rounded-full text-xs font-semibold">
                  Rich Editor
                </div>
              </div>
              <div class="p-4">
                <img 
                  src="/docs-editor.png" 
                  alt="Document Editor" 
                  class="w-full h-64 object-cover rounded-lg"
                />
                <div class="mt-4">
                  <h3 class="text-lg font-bold text-gray-900 dark:text-white mb-2">Document Editor</h3>
                  <p class="text-sm text-gray-600 dark:text-gray-300">Professional document editing with real-time collaboration and beautiful formatting.</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Workspace Dashboard -->
          <div class="group relative">
            <div class="absolute inset-0 bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-xl"></div>
            <div class="relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-200 dark:border-gray-700">
              <div class="absolute top-4 left-4 z-10">
                <div class="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-3 py-1 rounded-full text-xs font-semibold">
                  Workspace
                </div>
              </div>
              <div class="p-4">
                <img 
                  src="/drive_home.png" 
                  alt="Workspace Dashboard" 
                  class="w-full h-64 object-cover rounded-lg"
                />
                <div class="mt-4">
                  <h3 class="text-lg font-bold text-gray-900 dark:text-white mb-2">Unified Workspace</h3>
                  <p class="text-sm text-gray-600 dark:text-gray-300">All your documents, forms, and files in one beautiful, organized workspace.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div class="text-center mt-12">
          <Button size="lg" @click="goToLogin" class="bg-primary-600 hover:bg-primary-700 shadow-lg hover:shadow-xl transition-all duration-200">
            <Zap class="w-5 h-5 mr-2" />
            Try These Features Now
            <ArrowRight class="w-5 h-5 ml-2" />
          </Button>
        </div>
      </div>
    </section>

    <!-- Benefits -->
    <section class="py-20 px-4 dark:bg-gray-900/50 transition-colors">
      <div class="container mx-auto">
        <div class="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <h2 class="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-6 transition-colors">
              {{$t('Views.heading.why_choose_venmail_drive')}}
            </h2>
            <p class="text-xl text-gray-600 dark:text-gray-300 mb-8 transition-colors">
              {{$t('Views.text.take_control_of_your')}}
            </p>
            
            <div class="space-y-4">
              <div v-for="benefit in benefits" :key="benefit" class="flex items-center space-x-3">
                <div class="w-6 h-6 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center flex-shrink-0 transition-colors">
                  <Check class="w-4 h-4 text-green-600 dark:text-green-400 transition-colors" />
                </div>
                <span class="text-gray-700 dark:text-gray-200 font-medium transition-colors">{{ benefit }}</span>
              </div>
            </div>
          </div>
          
          <div class="bg-gradient-to-br from-primary-50 to-orange-50 dark:from-gray-800 dark:to-gray-700 rounded-2xl p-8 transition-colors">
            <div class="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm transition-colors">
              <h3 class="text-xl font-bold text-gray-900 dark:text-white mb-6 transition-colors">{{$t('Views.heading.choose_your_path')}}</h3>
              
              <div class="space-y-6">
                <div class="border-l-4 border-primary-500 pl-6 py-3 bg-primary-50 dark:bg-primary-900/20 rounded-r-lg">
                  <div class="flex items-center mb-2">
                    <Zap class="w-5 h-5 text-primary-600 mr-2" />
                    <h4 class="font-semibold text-gray-900 dark:text-white text-lg">{{$t('Views.heading.try_it_on_venmail')}}</h4>
                  </div>
                  <p class="text-gray-600 dark:text-gray-300 text-sm mb-3 transition-colors">Managed service with automatic updates, support, and enterprise features</p>
                  <Button @click="goToLogin" class="bg-primary-600 hover:bg-primary-700 text-white" size="sm">
                    {{$t('Commons.button.get_started')}}
                  </Button>
                </div>
                
                <div class="border-l-4 border-gray-400 pl-6 py-3 bg-gray-50 dark:bg-gray-800/50 rounded-r-lg">
                  <div class="flex items-center mb-2">
                    <GithubLogoIcon class="w-5 h-5 text-gray-600 mr-2" />
                    <h4 class="font-semibold text-gray-900 dark:text-white text-lg">{{$t('Commons.heading.self_host')}}</h4>
                  </div>
                  <p class="text-gray-600 dark:text-gray-300 text-sm mb-3 transition-colors">{{$t('Views.text.deploy_on_your_own')}}</p>
                  <Button @click="goToGithub" variant="outline" class="border-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700" size="sm">
                    {{$t('Commons.button.deploy_now')}}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA -->
    <section class="py-20 px-4 bg-gradient-to-r from-primary-500 to-primary-600">
      <div class="container mx-auto text-center">
        <h2 class="text-3xl md:text-4xl font-bold text-white mb-4">
          {{$t('Views.heading.ready_to_take_control')}}
        </h2>
        <p class="text-xl text-primary-100 mb-8 max-w-2xl mx-auto">
          {{$t('Views.text.join_thousands_of_users')}}
        </p>
        
        <div class="flex flex-col sm:flex-row gap-6 justify-center">
          <Button size="lg" variant="secondary" @click="goToLogin" class="text-lg px-8 py-4 bg-white text-primary-600 hover:bg-gray-50 shadow-lg">
            {{$t('Views.button.try_it_on_venmail')}}
            <span class="ml-2 text-sm opacity-75">Managed</span>
          </Button>
          <Button size="lg" variant="outline" @click="goToGithub" class="text-lg px-8 py-4 border-2 border-white text-white hover:bg-white hover:text-primary-600 transition-all duration-200">
            <GithubLogoIcon class="w-5 h-5 mr-2" />
            {{$t('Commons.button.self_host')}}
            <span class="ml-2 text-sm opacity-75">{{$t('Commons.text.free')}}</span>
          </Button>
        </div>
      </div>
    </section>

    <!-- Footer -->
    <footer class="bg-gray-900 dark:bg-gray-950 text-white py-12 px-4 transition-colors">
      <div class="container mx-auto">
        <div class="grid md:grid-cols-4 gap-8">
          <div>
            <div class="flex items-center space-x-2 mb-4">
              <div class="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center">
                <FileText class="w-5 h-5 text-white" />
              </div>
              <span class="text-xl font-bold dark:text-white">{{$t('Commons.text.venmail_drive')}}</span>
            </div>
            <p class="text-gray-400 dark:text-gray-300 text-sm transition-colors">
              {{$t('Views.text.open_source_productivity_suite')}}
            </p>
          </div>
          
          <div>
            <h4 class="font-semibold mb-4">{{$t('Commons.heading.product')}}</h4>
            <ul class="space-y-2 text-gray-400 dark:text-gray-300 text-sm transition-colors">
              <li><a href="#" @click="goToApp" class="hover:text-white">{{$t('Commons.link.managed_service')}}</a></li>
              <li><a href="#" @click="goToGithub" class="hover:text-white">Self-Hosting</a></li>
              <li><a href="#" @click="goToGithub" class="hover:text-white">{{$t('Commons.link.documentation')}}</a></li>
            </ul>
          </div>
          
          <div>
            <h4 class="font-semibold mb-4">Resources</h4>
            <ul class="space-y-2 text-gray-400 dark:text-gray-300 text-sm transition-colors">
              <li><a href="#" @click="goToGithub" class="hover:text-white">GitHub</a></li>
              <li><a href="#" @click="goToGithub" class="hover:text-white">{{$t('Commons.link.community')}}</a></li>
              <li><a href="#" @click="goToLogin" class="hover:text-white">{{$t('Commons.link.support')}}</a></li>
            </ul>
          </div>
          
          <div>
            <h4 class="font-semibold mb-4">Company</h4>
            <ul class="space-y-2 text-gray-400 dark:text-gray-300 text-sm transition-colors">
              <li><a href="https://venia.cloud" class="hover:text-white">{{$t('Commons.link.about')}}</a></li>
              <li><a href="https://venia.cloud" class="hover:text-white">{{$t('Commons.link.blog')}}</a></li>
              <li><a href="https://venia.cloud" class="hover:text-white">{{$t('Commons.link.contact')}}</a></li>
            </ul>
          </div>
        </div>
        
        <div class="border-t border-gray-800 dark:border-gray-700 mt-8 pt-8 text-center text-gray-400 dark:text-gray-300 text-sm transition-colors">
          <p>&copy; 2025 Venmail Drive. Licensed under MIT.</p>
        </div>
      </div>
    </footer>
  </div>
</template>
