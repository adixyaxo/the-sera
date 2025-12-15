# SERA — Smart Everyday Routine Assistant

<div align="center">
  <img src="https://img.shields.io/badge/React-18.3-blue?style=for-the-badge&logo=react" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Tailwind-3.4-blue?style=for-the-badge&logo=tailwindcss" alt="Tailwind" />
  <img src="https://img.shields.io/badge/Supabase-Cloud-green?style=for-the-badge&logo=supabase" alt="Supabase" />
  <img src="https://img.shields.io/badge/AI-Gemini-orange?style=for-the-badge&logo=google" alt="Gemini AI" />
</div>

---

## 🌟 Overview

**SERA** is an AI-first productivity application designed to help you manage your daily routines, tasks, projects, and notes with intelligent assistance. Built with modern web technologies and powered by Google's Gemini AI, SERA offers a seamless experience for organizing your life.

---

## ✨ Features

### 🧠 AI-Powered Assistant
- **Natural Language Understanding**: Talk to SERA in plain English to create tasks, schedule events, and manage your workflow
- **Voice Commands**: Use voice input to control the app hands-free
- **Smart Task Creation**: AI extracts dates, priorities, and context from your natural language input
- **Context-Aware Responses**: SERA understands your current tasks and provides relevant suggestions

### 📋 GTD Task Management
- **Kanban Board**: Organize tasks in NOW / NEXT / LATER columns
- **Drag & Drop**: Easily move tasks between columns
- **Priority Levels**: High, Medium, Low priority with visual indicators
- **Deadlines**: Set and track due dates
- **Project Association**: Link tasks to projects
- **Life Area Tags**: Categorize tasks (Health, Work, Finance, etc.)

### 📅 Calendar & Events
- **Event Management**: Create, edit, and delete calendar events
- **Unified View**: See tasks, events, and project deadlines together
- **Filtering**: Filter by type (events, tasks, projects)
- **Color Coding**: Visual distinction between different item types

### 📁 Projects
- **Project Organization**: Group related tasks under projects
- **Status Tracking**: Active, On Hold, Completed statuses
- **Progress Indicators**: Visual progress bars
- **Expandable Cards**: Click to see project details and related tasks

### 📝 Notes
- **Rich Notes**: Create and manage notes with titles and content
- **Persistent Storage**: All notes synced to the cloud
- **Quick Access**: Easy navigation and search

### 📊 Analytics
- **Productivity Stats**: Track completed tasks and streaks
- **Visual Charts**: Weekly activity graphs
- **GTD Distribution**: See how tasks are distributed across columns
- **Completion Rates**: Monitor your productivity trends

### 🎤 Voice Input
- **Speech Recognition**: Browser-native speech-to-text
- **AI Processing**: Voice commands processed by Gemini AI
- **Multi-Command Support**: Create tasks, notes, events via voice
- **Navigation**: Voice-controlled app navigation

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ installed
- npm or bun package manager

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd sera-life-cockpit
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   bun install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   # or
   bun run dev
   ```

4. **Open in browser**
   ```
   http://localhost:5173
   ```

---

## 🔧 Configuration

### Environment Variables

The app uses Lovable Cloud (Supabase) which is pre-configured. No additional environment setup is required for basic usage.

### AI Configuration

SERA uses **Lovable AI Gateway** which provides access to Google Gemini models. The API key is automatically configured through Lovable Cloud.

**Note**: The LOVABLE_API_KEY is pre-configured in the cloud environment. You don't need to add any API keys manually.

---

## 🏗️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 18, TypeScript, Vite |
| **Styling** | Tailwind CSS, Framer Motion |
| **UI Components** | shadcn/ui, Radix UI |
| **Backend** | Supabase (Lovable Cloud) |
| **Database** | PostgreSQL (via Supabase) |
| **Authentication** | Supabase Auth |
| **AI** | Google Gemini via Lovable AI Gateway |
| **Edge Functions** | Deno (Supabase Edge Functions) |

---

## 📁 Project Structure

```
src/
├── components/
│   ├── dashboard/      # Dashboard widgets
│   ├── gtd/            # GTD/Kanban components
│   ├── layout/         # Layout components
│   ├── sera/           # SERA AI assistant components
│   └── ui/             # Reusable UI components
├── contexts/           # React contexts
├── hooks/              # Custom React hooks
├── integrations/       # Third-party integrations
├── pages/              # Route pages
└── lib/                # Utility functions

supabase/
├── functions/          # Edge functions
│   ├── sera-assistant/ # AI chat assistant
│   ├── sera-execute/   # Action executor
│   ├── sera-planner/   # AI planning
│   └── voice-processor/# Voice command processing
└── migrations/         # Database migrations
```

---

## 🎯 Usage Guide

### Voice Commands

Press the **microphone button** and speak:

- **Tasks**: "Add a task to review the project proposal by Friday with high priority"
- **Notes**: "Create a note about today's meeting highlights"
- **Events**: "Schedule a call with the team tomorrow at 3pm"
- **Navigation**: "Go to calendar" or "Open projects"

### Quick Capture

The dashboard includes a **Quick Capture** input where you can:
1. Type or speak your request
2. SERA AI processes and understands your intent
3. Actions are created automatically

### Keyboard Shortcuts

- `Enter` - Submit message/task
- `Shift + Enter` - New line in input

---

## 🔒 Security

- **Row Level Security (RLS)**: All data is secured per-user
- **Authentication Required**: Full auth flow with email confirmation
- **Secure API Keys**: All secrets stored in Supabase Vault
- **CORS Protected**: Edge functions have proper CORS headers

---

## 📱 Responsive Design

SERA is fully responsive and works on:
- 💻 Desktop browsers
- 📱 Mobile phones
- 📲 Tablets

---

## 🛠️ Development

### Running Tests
```bash
npm run test
```

### Building for Production
```bash
npm run build
```

### Linting
```bash
npm run lint
```

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is private and created for personal use.

---

## 👨‍💻 Author

**Made by Aditya**

---

## 🙏 Acknowledgments

- [Lovable](https://lovable.dev) - AI-powered development platform
- [Supabase](https://supabase.com) - Backend infrastructure
- [shadcn/ui](https://ui.shadcn.com) - Beautiful UI components
- [Framer Motion](https://www.framer.com/motion/) - Animation library

---

<div align="center">
  <strong>SERA — Your Smart Everyday Routine Assistant</strong>
  <br />
  <em>Focus. Clarity. Discipline. Systems over motivation.</em>
</div>
