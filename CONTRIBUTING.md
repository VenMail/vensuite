# Contributing to Vensuite

Thank you for your interest in contributing to Vensuite! This guide will help you get started with contributing to our open-source productivity suite.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- pnpm (required) - see package.json for version
- Git

### Setup
1. Fork the repository
2. Clone your fork locally
3. Install dependencies:
   ```bash
   pnpm install
   ```
4. Copy `.env.example` to `.env` and configure your environment
5. Start the development server:
   ```bash
   pnpm dev
   ```

## 📋 How to Contribute

### 🐛 Reporting Issues

**Before opening an issue:**
- Search existing issues to avoid duplicates
- Check if the issue is already fixed in the latest version
- Ensure your issue is reproducible

**When opening an issue:**
- Use clear, descriptive titles
- Provide detailed steps to reproduce
- Include your environment (OS, browser, version)
- Add screenshots/screen recordings if applicable
- Use the appropriate issue template

**Issue Types:**
- 🐛 **Bug Report** - Unexpected behavior or errors
- ✨ **Feature Request** - New functionality suggestions
- 📚 **Documentation** - Improvements to docs or README
- 🎨 **UI/UX** - Design and user experience improvements
- 🔧 **Performance** - Speed and optimization issues

### 💻 Making Changes

#### Development Workflow
1. Create a new branch from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/issue-number-description
   ```

2. Make your changes following our [Code Style](#code-style)

3. Test your changes:
   ```bash
   # Type checking
   pnpm build
   ```

4. Commit your changes:
   ```bash
   git commit -m "feat: add new slide collaboration feature"
   ```

5. Push to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```

6. Open a Pull Request

#### Commit Message Convention
We follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code refactoring
- `chore:` - Maintenance tasks

Examples:
```
feat: add real-time collaboration for slides
fix: resolve sheet formula parsing error
docs: update API documentation
```

### 🎨 Code Style

#### TypeScript/Vue Guidelines
- Use TypeScript for all new code
- Follow Vue 3 Composition API patterns
- Use `<script setup>` syntax for single-file components
- Implement proper prop types and emits

#### Code Formatting
- Use Prettier for code formatting
- Use ESLint for linting
- Configure your editor to use our `.editorconfig`

#### Naming Conventions
- **Components**: PascalCase (`SlideEditor.vue`)
- **Files**: kebab-case (`slide-editor.ts`)
- **Variables**: camelCase (`slideData`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_SLIDE_COUNT`)
- **Functions**: camelCase (`handleSlideUpdate`)

#### File Organization
```
src/
├── components/          # Reusable components
│   ├── forms/          # Form-specific components
│   ├── slides/         # Slide-specific components
│   ├── editor/         # Document editor components
│   └── ui/             # Generic UI components
├── views/              # Page-level components
├── store/              # Pinia stores
├── services/           # API and external services
├── composables/        # Vue composables
├── utils/              # Utility functions
├── types/              # TypeScript type definitions
└── assets/             # Static assets
```

### 📝 Documentation

#### Updating Documentation
- Keep README.md up to date with new features
- Add JSDoc comments for complex functions
- Update component props documentation
- Include examples in feature descriptions

#### Documentation Style
- Use clear, concise language
- Include code examples where helpful
- Use proper markdown formatting
- Add screenshots for UI changes

### 🔄 Pull Request Process

#### Before Opening PR
1. Ensure your branch is up to date with main
2. Run build to check for type errors
3. Update documentation if needed
4. Squash related commits into logical units

#### PR Requirements
- Clear title and description
- Link to related issues
- Include screenshots for UI changes
- List breaking changes (if any)

## 🏗️ Architecture Overview

### Tech Stack
- **Frontend**: Vue 3, TypeScript, Vite
- **State Management**: Pinia
- **UI**: Tailwind CSS, DaisyUI, Radix Vue
- **Documents**: TipTap, ProseMirror
- **Sheets**: Univer
- **Slides**: AVNAC Vue
- **Real-time**: Y.js, WebSocket
- **Build**: Vite, Docker

### Key Areas
- **Documents** - Rich text editing with TipTap
- **Sheets** - Spreadsheet functionality with Univer
- **Forms** - Form builder and player
- **Auth** - Authentication and user management

## 🤝 Community Guidelines

### Code of Conduct
- Be respectful and inclusive
- Welcome newcomers and help them learn
- Focus on constructive feedback
- Avoid personal attacks or criticism

### Getting Help
- Check existing documentation first
- Search issues and discussions
- Join our community discussions
- Ask questions in appropriate channels

### Recognition
- Contributors are recognized in our README
- Major contributors may be invited to the core team
- Exceptional contributions are highlighted in releases

## 📞 Contact

- **Issues**: [GitHub Issues](https://github.com/venmail/vensuite/issues)
- **Discussions**: [GitHub Discussions](https://github.com/venmail/vensuite/discussions)
- **Email**: hello@venmail.io

## 📜 License

By contributing to Vensuite, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to Vensuite! 🎉
