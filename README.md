# CareerPilot — AI Job Application Copilot

CareerPilot is a premium SaaS product designed to help job seekers manage their entire job application process using AI. It provides intelligent resume analysis, job matching, personalized resume improvements, interview coaching, and a visual application tracker.

## 🚀 Features

- **Resume Intelligence**: Upload your PDF resume for instant AI analysis, scoring, and actionable feedback.
- **Job Matching**: Paste a job description and instantly see how well your resume aligns, highlighting missing skills and keywords.
- **AI Resume Improvement**: Select specific bullet points on your resume and let AI rewrite them to be more impactful, concise, and tailored to the job.
- **Interview Coach**: Generate role-specific interview questions and receive AI-driven feedback on your answers.
- **Application Tracker**: A visual Kanban board to track your applications from "Saved" to "Offer".

## 🛠️ Technology Stack

- **Frontend**: Next.js 14+ (App Router), TypeScript, Tailwind CSS, shadcn/ui, Framer Motion
- **Backend**: Next.js Route Handlers & Server Actions, Prisma ORM, PostgreSQL (Supabase)
- **Authentication**: Auth.js (NextAuth)
- **AI Integration**: OpenAI API with structured JSON outputs (Zod)
- **Storage**: Supabase Storage

## 📦 Getting Started

### Prerequisites

- Node.js 18+
- npm or pnpm
- A PostgreSQL database (e.g., Supabase)
- OpenAI API Key

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/careerpilot.git
   cd careerpilot
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   Create a `.env.local` file and add the required keys (see `.env.example`).

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🎨 Design System

CareerPilot uses a custom design system built on top of Tailwind CSS and shadcn/ui. The design is inspired by high-end SaaS products, featuring a neutral color palette, subtle borders, premium typography (Inter & JetBrains Mono), and fluid animations via Framer Motion.

## 📄 License

This project is created as a portfolio piece.
