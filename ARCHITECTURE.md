# System Architecture: CareerPilot

This document outlines the architectural decisions and system design of the CareerPilot platform.

## 1. Separation of Concerns (Service Layer)

Instead of embedding OpenAI logic directly into React components or Server Actions, the AI logic is abstracted into a dedicated service layer located in `src/lib/ai/`.

- `client.ts`: Instantiates the OpenAI SDK singleton.
- `schema.ts`: Defines the `zod` boundaries. Every AI response must satisfy these schemas before hitting the database or the client.
- `job-matcher.ts`, `resume-improver.ts`, `interview-coach.ts`: Pure asynchronous functions that handle prompt engineering, API interaction, and Zod validation.

**Why?** This makes the AI services highly testable. We can easily write unit tests for `job-matcher.ts` without needing a Next.js environment or a database connection.

## 2. Server Actions as Controllers

The `src/app/actions/` directory acts as the controller layer bridging the Client UI and the Database/AI Services.

Example flow for improving a resume bullet:
1. `page.tsx` (Client) calls `improveBulletAction(originalText)`.
2. `improveBulletAction` (Server) calls the `resume-improver.ts` service.
3. The Server Action receives the Zod-validated JSON, optionally saves it to Prisma, and returns a standard `{ success: true, data: ... }` pattern.

**Why?** This prevents secret leakage and centralizes database mutation logic and cache invalidation (`revalidatePath`).

## 3. Database Design (Prisma v7)

The relational model is designed for complex data tracking over time.

- `User` 1:n `Application`
- `Application` 1:n `ApplicationEvent` (Timeline tracking for status changes, interviews, and notes)
- `Resume` 1:1 `ResumeAnalysis` (Cached AI evaluation)
- `Job` 1:1 `JobAnalysis`
- `Resume` & `Job` m:n `JobMatch` (Join table storing the AI match score between a specific resume and a specific job)

We use the new `@prisma/adapter-pg` to ensure compatibility with modern deployment environments (like Edge runtimes) should the project scale.

## 4. UI/UX Philosophy

The UI is built to feel like a premium, consumer SaaS product rather than a generic template.
- **Micro-interactions:** Extensive use of `framer-motion` for complex SVG animations (like the match score rings) and layout transitions (expanding AI result cards).
- **Feedback Loops:** Loading states explicitly tell the user what the AI is doing ("Analyzing technical depth...").
- **Consistency:** Powered by Tailwind v4 CSS variables and standard Shadcn component boundaries.
