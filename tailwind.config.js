const animate = require('tailwindcss-animate')
const defaultTheme = require('tailwindcss/defaultTheme')

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  safelist: ['dark'],
  prefix: '',

  content: [
    './pages/**/*.{ts,tsx,vue}',
    './components/**/*.{ts,tsx,vue}',
    './app/**/*.{ts,tsx,vue}',
    './src/**/*.{ts,tsx,vue}',
  ],
  theme: {
  	container: {
  		center: true,
  		padding: '2rem',
  		screens: {
  			'2xl': '1400px'
  		}
  	},
  	extend: {
  		height: {
  			mail: 'calc(100vh - 66px)!important'
  		},
  		width: {
  			'mail-mobile': '100%!important'
  		},
  		maxWidth: {
  			'mail-mobile': '100%!important'
  		},
  		colors: {
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			primary: {
  				'50': '#FFEFEB',
  				'100': '#fff7ed',
  				'200': '#ffedd5',
  				'300': '#fed7aa',
  				'400': '#fdba74',
  				'500': '#FF5C39',
  				'600': '#ea580c',
  				'700': '#c2410c',
  				'800': '#9a3412',
  				'900': '#7c2d12',
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				'100': '#f3f4f6',
  				'200': '#e5e7eb',
  				'300': '#d1d5db',
  				'400': '#9ca3af',
  				'500': '#6b7280',
  				'600': '#4b5563',
  				'700': '#374151',
  				'800': '#1f2937',
  				'900': '#111827',
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			blue: {
  				'100': '#dbeafe',
  				'200': '#bfdbfe',
  				'300': '#93c5fd',
  				'400': '#60a5fa',
  				'500': '#3b82f6',
  				'600': '#2563eb',
  				'700': '#1d4ed8',
  				'800': '#1e40af',
  				'900': '#1e3a8a'
  			},
  			green: {
  				'100': '#dcfce7',
  				'200': '#bbf7d0',
  				'300': '#86efac',
  				'400': '#4ade80',
  				'500': '#22c55e',
  				'600': '#16a34a',
  				'700': '#15803d',
  				'800': '#166534',
  				'900': '#14532d'
  			},
  			yellow: {
  				'100': '#FEF3CB',
  				'200': '#fef08a',
  				'300': '#fde047',
  				'400': '#facc15',
  				'500': '#eab308',
  				'600': '#ca8a04',
  				'700': '#a16207',
  				'800': '#8B7630',
  				'900': '#713f12'
  			},
  			grey: {
  				'100': '#F4F7F9',
  				'200': '#f3f4f6',
  				'300': '#e5e7eb',
  				'400': '#d1d5db',
  				'500': '#9ca3af',
  				'600': '#6b7280',
  				'700': '#4b5563',
  				'800': '#374151',
  				'900': '#1f2937'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			}
  		},
  		boxShadow: {
  			'md-strong': '0px 4px 8px rgba(0, 0, 0, 0.25)'
  		},
  		borderColor: {
  			glass: 'hsla(0, 0%, 100%, 0.18)'
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		fontFamily: {
  			sans: [
  				'Onest',
                    ...defaultTheme.fontFamily.sans
                ]
  		},
  		keyframes: {
  			'accordion-down': {
  				from: {
  					height: '0'
  				},
  				to: {
  					height: 'var(--reka-accordion-content-height)'
  				}
  			},
  			'accordion-up': {
  				from: {
  					height: 'var(--reka-accordion-content-height)'
  				},
  				to: {
  					height: '0'
  				}
  			},
  			jiggle: {
  				'0%, 100%': {
  					transform: 'translateX(0) scale(1.05);'
  				},
  				'25%': {
  					transform: 'translateX(-5px) scale(1.05);'
  				},
  				'75%': {
  					transform: 'translateX(5px) scale(1.05);'
  				}
  			},
  			wobble: {
  				'0%, 100%': {
  					transform: 'rotate(0deg)'
  				},
  				'25%': {
  					transform: 'rotate(-5deg)'
  				},
  				'75%': {
  					transform: 'rotate(5deg)'
  				}
  			},
  			twinkle: {
  				'0%, 100%': {
  					opacity: 0.5
  				},
  				'50%': {
  					opacity: 1
  				}
  			},
  			glide: {
  				'0%': {
  					backgroundPosition: '0 0'
  				},
  				'100%': {
  					backgroundPosition: '50px 50px'
  				}
  			},
  			float: {
  				'0%, 100%': {
  					transform: 'translateY(0);'
  				},
  				'50%': {
  					transform: 'translateY(-10px);'
  				}
  			}
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out',
  			wobble: 'wobble 1s ease-in-out',
  			jiggle: 'jiggle 0.5s ease-in-out',
  			twinkle: 'twinkle 4s infinite',
  			glide: 'glide 15s linear infinite',
  			float: 'float 3s ease-in-out infinite'
  		}
  	}
  },
  plugins: [
    animate,
    require('@tailwindcss/typography'),
    require("tailwindcss-animate")
  ],
}
