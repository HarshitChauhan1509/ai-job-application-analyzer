# CareerPilot — AI Job Application Copilot

![CareerPilot Banner](https://via.placeholder.com/1200x400/0f172a/ffffff?text=CareerPilot+-+AI+Job+Application+Copilot)

CareerPilot is a premium, full-stack SaaS platform designed to help software engineers navigate their job search. It replaces messy spreadsheets and generic AI chats with an organized pipeline, precise resume matching, and dynamic mock interviews tailored to specific job descriptions.

## 🚀 Core Features

- **Application Pipeline Kanban**: A drag-and-drop board to track the lifecycle of your applications.
- **AI Resume Analyzer**: Upload a resume and get instant scores on ATS compatibility, skill representation, and experience impact.
- **Job Match Engine**: Paste a job description and instantly see your Match Score (0-100), missing hard requirements, and actionable recommendations.
- **Smart Auto-Tailoring**: Select any bullet point on your resume and have the AI rewrite it (e.g., "Add Impact using X-Y-Z formula", "Make more technical").
- **Interview Coach**: Configure a mock interview for a specific role and difficulty. The AI acts as the interviewer, evaluating your technical depth, clarity, and offering real-time feedback and follow-up questions.

## 🛠 Tech Stack

This project was built using modern React ecosystem standards and bleeding-edge dependencies:

- **Framework**: [Next.js 15](https://nextjs.org/) (App Router, React 19)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/) & [shadcn/ui](https://ui.shadcn.com/)
- **Database**: PostgreSQL with [Prisma ORM v7](https://www.prisma.io/) (using the new `@prisma/adapter-pg` driver adapters)
- **AI/LLM**: OpenAI API (`gpt-4-turbo`) with structured JSON parsing via Zod schemas.
- **Animations**: [Framer Motion](https://www.framer.com/motion/) (SVG path animations, route transitions)
- **Interactions**: `@hello-pangea/dnd` for fluid Kanban drag-and-drop.

## 📐 Architecture & Data Flow

CareerPilot heavily utilizes Next.js **Server Actions** to keep secrets (like the `OPENAI_API_KEY` and Database URLs) strictly on the server.

1. **Client Components** handle the rich UI state (Kanban drag-and-drop, microphone recording toggles, SVG animations).
2. When an AI operation is requested, the client invokes a Server Action (e.g., `matchJobAction`).
3. The Server Action communicates with the `/lib/ai/` service layer, which prompts the OpenAI API using strict `response_format: { type: "json_object" }` instructions.
4. The AI response is parsed and validated against robust **Zod Schemas** to ensure UI safety.
5. The validated data is persisted to PostgreSQL via Prisma.
6. The Server Action calls `revalidatePath` to automatically update the Client UI with the fresh database state.

## 💻 Running Locally

### Prerequisites
- Node.js (v20+)
- PostgreSQL database (Local or hosted via Supabase/Neon)
- OpenAI API Key

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/ai-job-application-analyzer.git
   cd ai-job-application-analyzer
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Environment Variables**
   Rename `.env.example` to `.env` and fill in your credentials:
   ```env
   DATABASE_URL="postgresql://user:password@localhost:5432/careerpilot"
   OPENAI_API_KEY="sk-your-openai-api-key"
   ```

4. **Initialize the Database**
   Push the Prisma schema to your PostgreSQL database and generate the v7 client:
   ```bash
   npx prisma db push
   npx prisma generate
   ```

5. **Run the Development Server**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📝 License
This project is open-source and available under the MIT License.
