<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Mail, 
  Calendar, 
  FileText, 
  Users, 
  TrendingUp, 
  Shield, 
  Github,
  ArrowRight,
  Check,
  Star,
  Zap
} from 'lucide-vue-next'

const router = useRouter()

const features = [
  {
    icon: FileText,
    title: 'Documents',
    description: 'Rich text editor with real-time collaboration and AI assistance'
  },
  {
    icon: TrendingUp,
    title: 'Sheets',
    description: 'Powerful spreadsheets with formulas, charts, and data analysis'
  },
  {
    icon: Calendar,
    title: 'Forms',
    description: 'Build surveys and collect data with payment integration'
  },
  {
    icon: Users,
    title: 'Slides',
    description: 'Create presentations with templates and real-time collaboration'
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
  window.location.href = 'https://m.venmail.io'
}

const goToGithub = () => {
  window.open('https://github.com/venmail/vensuite', '_blank')
}
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
    <!-- Header -->
    <header class="border-b bg-white/80 backdrop-blur-sm">
      <div class="container mx-auto px-4 py-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-2">
            <div class="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <FileText class="w-5 h-5 text-white" />
            </div>
            <span class="text-xl font-bold text-gray-900">Vensuite</span>
            <Badge variant="secondary" class="text-xs">Open Source</Badge>
          </div>
          <div class="flex items-center space-x-4">
            <Button variant="ghost" @click="goToGithub">
              <Github class="w-4 h-4 mr-2" />
              GitHub
            </Button>
            <Button @click="goToApp">
              Get Started
              <ArrowRight class="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    </header>

    <!-- Hero Section -->
    <section class="py-20 px-4">
      <div class="container mx-auto text-center">
        <div class="inline-flex items-center space-x-2 bg-blue-100 text-blue-800 px-4 py-2 rounded-full text-sm font-medium mb-6">
          <Shield class="w-4 h-4" />
          <span>Privacy-First Productivity Suite</span>
        </div>
        
        <h1 class="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
          Your Workspace,
          <br />
          <span class="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
            Your Rules
          </span>
        </h1>
        
        <p class="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
          Complete open-source productivity suite with documents, spreadsheets, forms, and presentations. 
          Self-hosted or use our managed service. No tracking, no ads, just pure productivity.
        </p>
        
        <div class="flex flex-col sm:flex-row gap-4 justify-center mb-12">
          <Button size="lg" @click="goToApp" class="text-lg px-8">
            <Zap class="w-5 h-5 mr-2" />
            Try Managed Service
          </Button>
          <Button size="lg" variant="outline" @click="goToGithub" class="text-lg px-8">
            <Github class="w-5 h-5 mr-2" />
            Self-Host Free
          </Button>
        </div>

        <div class="flex items-center justify-center space-x-8 text-sm text-gray-500">
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
            <span>100% open source</span>
          </div>
        </div>
      </div>
    </section>

    <!-- Features Grid -->
    <section class="py-20 px-4 bg-white">
      <div class="container mx-auto">
        <div class="text-center mb-16">
          <h2 class="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Everything You Need to Get Work Done
          </h2>
          <p class="text-xl text-gray-600 max-w-2xl mx-auto">
            All the essential productivity tools, built with privacy and collaboration in mind
          </p>
        </div>
        
        <div class="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card v-for="feature in features" :key="feature.title" class="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div class="w-12 h-12 bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg flex items-center justify-center mb-4">
                <component :is="feature.icon" class="w-6 h-6 text-blue-600" />
              </div>
              <CardTitle class="text-lg">{{ feature.title }}</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription class="text-gray-600">
                {{ feature.description }}
              </CardDescription>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>

    <!-- Benefits -->
    <section class="py-20 px-4">
      <div class="container mx-auto">
        <div class="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <h2 class="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
              Why Choose Vensuite?
            </h2>
            <p class="text-xl text-gray-600 mb-8">
              Take control of your data and workflow with an open-source alternative that respects your privacy.
            </p>
            
            <div class="space-y-4">
              <div v-for="benefit in benefits" :key="benefit" class="flex items-center space-x-3">
                <div class="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Check class="w-4 h-4 text-green-600" />
                </div>
                <span class="text-gray-700 font-medium">{{ benefit }}</span>
              </div>
            </div>
          </div>
          
          <div class="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl p-8">
            <div class="bg-white rounded-xl p-6 shadow-sm">
              <h3 class="text-xl font-bold text-gray-900 mb-4">Two Ways to Use Vensuite</h3>
              
              <div class="space-y-4">
                <div class="border-l-4 border-blue-500 pl-4">
                  <h4 class="font-semibold text-gray-900">Managed Service</h4>
                  <p class="text-gray-600 text-sm">Hosted at m.venmail.io with automatic updates and support</p>
                  <Button @click="goToApp" class="mt-2" size="sm">Get Started</Button>
                </div>
                
                <div class="border-l-4 border-purple-500 pl-4">
                  <h4 class="font-semibold text-gray-900">Self-Hosted</h4>
                  <p class="text-gray-600 text-sm">Deploy on your own infrastructure for maximum control</p>
                  <Button @click="goToGithub" variant="outline" class="mt-2" size="sm">Deploy Now</Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA -->
    <section class="py-20 px-4 bg-gradient-to-r from-blue-600 to-purple-600">
      <div class="container mx-auto text-center">
        <h2 class="text-3xl md:text-4xl font-bold text-white mb-4">
          Ready to Take Control of Your Productivity?
        </h2>
        <p class="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
          Join thousands of users who've made the switch to privacy-first productivity tools.
        </p>
        
        <div class="flex flex-col sm:flex-row gap-4 justify-center">
          <Button size="lg" variant="secondary" @click="goToApp" class="text-lg px-8">
            Start Free Trial
          </Button>
          <Button size="lg" variant="outline" @click="goToGithub" class="text-lg px-8 border-white text-white hover:bg-white hover:text-gray-900">
            View on GitHub
          </Button>
        </div>
      </div>
    </section>

    <!-- Footer -->
    <footer class="bg-gray-900 text-white py-12 px-4">
      <div class="container mx-auto">
        <div class="grid md:grid-cols-4 gap-8">
          <div>
            <div class="flex items-center space-x-2 mb-4">
              <div class="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <FileText class="w-5 h-5 text-white" />
              </div>
              <span class="text-xl font-bold">Vensuite</span>
            </div>
            <p class="text-gray-400 text-sm">
              Open-source productivity suite for modern teams.
            </p>
          </div>
          
          <div>
            <h4 class="font-semibold mb-4">Product</h4>
            <ul class="space-y-2 text-gray-400 text-sm">
              <li><a href="#" @click="goToApp" class="hover:text-white">Managed Service</a></li>
              <li><a href="#" @click="goToGithub" class="hover:text-white">Self-Hosting</a></li>
              <li><a href="#" @click="goToGithub" class="hover:text-white">Documentation</a></li>
            </ul>
          </div>
          
          <div>
            <h4 class="font-semibold mb-4">Resources</h4>
            <ul class="space-y-2 text-gray-400 text-sm">
              <li><a href="#" @click="goToGithub" class="hover:text-white">GitHub</a></li>
              <li><a href="#" @click="goToGithub" class="hover:text-white">Community</a></li>
              <li><a href="#" @click="goToApp" class="hover:text-white">Support</a></li>
            </ul>
          </div>
          
          <div>
            <h4 class="font-semibold mb-4">Company</h4>
            <ul class="space-y-2 text-gray-400 text-sm">
              <li><a href="https://venia.cloud" class="hover:text-white">About</a></li>
              <li><a href="https://venia.cloud" class="hover:text-white">Blog</a></li>
              <li><a href="https://venia.cloud" class="hover:text-white">Contact</a></li>
            </ul>
          </div>
        </div>
        
        <div class="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400 text-sm">
          <p>&copy; 2025 Vensuite. Licensed under MIT.</p>
        </div>
      </div>
    </footer>
  </div>
</template>
