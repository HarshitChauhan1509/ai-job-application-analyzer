import { prisma } from "./db";

export interface CuratedJobDef {
  company: string;
  position: string;
  department: string;
  startupStage: string;
  location: string;
  employmentType: string;
  salaryRange: string;
  url: string;
  description: string;
  requiredSkills: string[];
  preferredSkills: string[];
  responsibilities: string[];
  keywords: string[];
  seniority: string;
}

export const CURATED_STARTUP_JOBS: CuratedJobDef[] = [
  {
    company: "Linear",
    position: "Senior Fullstack Engineer",
    department: "Fullstack",
    startupStage: "Series B",
    location: "Remote (Global) / San Francisco",
    employmentType: "Full-time",
    salaryRange: "$160k - $210k • 0.15% - 0.3%",
    url: "https://linear.app/careers",
    description:
      "Linear builds the modern standard for product development and issue tracking. We are seeking a Senior Fullstack Engineer to lead core user-facing workflows, real-time synchronization engines, and high-performance client state architectures.",
    requiredSkills: ["TypeScript", "React", "Node.js", "GraphQL", "WebSockets"],
    preferredSkills: ["SQLite", "Sync Engines", "IndexedDB", "Tailwind CSS"],
    responsibilities: [
      "Architect offline-first real-time synchronization engines for client applications",
      "Design intuitive, keyboard-first desktop and web interfaces using React and TypeScript",
      "Collaborate directly with designers and founders to iterate rapidly on product feel",
    ],
    keywords: ["Real-time", "Sync", "Productivity", "Fast UX", "Keyboard-first", "GraphQL"],
    seniority: "Senior",
  },
  {
    company: "Supabase",
    position: "Distributed Systems & Cloud Engineer",
    department: "Backend",
    startupStage: "Series B",
    location: "Remote (Global)",
    employmentType: "Full-time",
    salaryRange: "$150k - $195k • 0.1% - 0.25%",
    url: "https://supabase.com/careers",
    description:
      "Supabase is the open-source Firebase alternative built on PostgreSQL. We are looking for a Systems & Cloud Engineer to scale our multi-tenant PostgreSQL orchestration platform, edge compute network, and database clustering layers.",
    requiredSkills: ["Go", "PostgreSQL", "Docker", "Kubernetes", "Linux Internals"],
    preferredSkills: ["Elixir", "Rust", "Terraform", "eBPF", "AWS"],
    responsibilities: [
      "Manage and automate the orchestration of tens of thousands of dedicated PostgreSQL clusters",
      "Improve replication, failover reliability, and disaster recovery subsystems",
      "Contribute directly to open-source database tooling and cloud infrastructure",
    ],
    keywords: ["PostgreSQL", "Open Source", "Database Orchestration", "Cloud Infrastructure", "Kubernetes"],
    seniority: "Mid-Senior",
  },
  {
    company: "Resend",
    position: "Founding Frontend Engineer",
    department: "Frontend",
    startupStage: "Series A",
    location: "Remote (Global)",
    employmentType: "Full-time",
    salaryRange: "$140k - $185k • 0.4% - 0.8%",
    url: "https://resend.com/careers",
    description:
      "Resend is reimagining email for developers with clean APIs, modern aesthetics, and developer-first DX. As a Founding Frontend Engineer, you will craft pixel-perfect user dashboards, interactive email builders, and lightning-fast developer telemetry.",
    requiredSkills: ["Next.js", "React", "TypeScript", "Tailwind CSS", "Web Performance"],
    preferredSkills: ["Framer Motion", "Design Systems", "Edge Functions", "Radix UI"],
    responsibilities: [
      "Build stunning, responsive developer console experiences using Next.js App Router and Tailwind",
      "Maintain our open-source React Email component library and email design tools",
      "Benchmark and optimize web core vitals and sub-100ms UI interactions",
    ],
    keywords: ["Developer Experience", "Design Engineering", "Next.js", "React Email", "Tailwind CSS"],
    seniority: "Senior",
  },
  {
    company: "Perplexity AI",
    position: "AI Infrastructure & Inference Engineer",
    department: "AI / ML",
    startupStage: "Growth / Unicorn",
    location: "San Francisco, CA / Hybrid",
    employmentType: "Full-time",
    salaryRange: "$190k - $260k • 0.1% - 0.25%",
    url: "https://perplexity.ai/careers",
    description:
      "Perplexity is pioneering conversational search and answer engines powered by large language models. We are seeking an Inference & AI Infrastructure Engineer to optimize GPU model serving, multi-step search latency, and high-throughput real-time retrieval.",
    requiredSkills: ["Python", "PyTorch", "vLLM / TensorRT-LLM", "CUDA", "FastAPI"],
    preferredSkills: ["Kubernetes", "Triton Inference Server", "C++", "RAG Systems"],
    responsibilities: [
      "Scale distributed LLM inference clusters across thousands of cutting-edge GPUs",
      "Cut end-to-end token latency and implement speculative decoding and KV-cache optimizations",
      "Build resilient fallback pipelines across proprietary and open-weights foundation models",
    ],
    keywords: ["LLM Inference", "GPU Serving", "CUDA", "vLLM", "RAG", "Conversational Search"],
    seniority: "Senior / Staff",
  },
  {
    company: "Vercel",
    position: "Senior Next.js Framework Engineer",
    department: "Frontend",
    startupStage: "Growth",
    location: "Remote (US / Europe)",
    employmentType: "Full-time",
    salaryRange: "$170k - $225k",
    url: "https://vercel.com/careers",
    description:
      "Vercel enables developers to build the fastest web applications. Join the Next.js core engineering team to innovate on React Server Components, server actions, Turbopack incremental bundling, and edge streaming architectures.",
    requiredSkills: ["Next.js", "React", "TypeScript", "Node.js", "Compiler / Bundler Architectures"],
    preferredSkills: ["Rust", "SWC", "Turbopack", "Web Standards", "HTTP/3"],
    responsibilities: [
      "Develop core Next.js framework capabilities, caching algorithms, and developer APIs",
      "Profile and eliminate compilation bottlenecks in Turbopack development servers",
      "Collaborate directly with the React core team and developer community on RFCs",
    ],
    keywords: ["Next.js", "React Server Components", "Turbopack", "Compiler", "Bundlers", "Edge"],
    seniority: "Senior",
  },
  {
    company: "Vapi (Voice AI)",
    position: "Full Stack AI Voice Engineer",
    department: "AI / ML",
    startupStage: "Seed (YC W24)",
    location: "Remote / San Francisco",
    employmentType: "Full-time",
    salaryRange: "$140k - $190k • 0.25% - 0.75%",
    url: "https://vapi.ai",
    description:
      "Vapi is building the developer platform for real-time voice AI agents. We are looking for an engineer to optimize sub-500ms voice-to-voice pipelines integrating WebRTC, speech-to-text, LLMs, and real-time audio streaming.",
    requiredSkills: ["WebSockets", "WebRTC", "TypeScript", "Node.js", "Python"],
    preferredSkills: ["LiveKit", "OpenAI Realtime API", "Audio DSP", "Whisper", "ElevenLabs"],
    responsibilities: [
      "Engineer ultra-low-latency bidirectional audio streaming architectures over WebRTC",
      "Integrate and benchmark speech models with streaming LLM token generation",
      "Build developer SDKs and telemetry dashboards for voice agent developers",
    ],
    keywords: ["Voice AI", "WebRTC", "Audio Streaming", "Realtime AI", "LiveKit", "FastAPI"],
    seniority: "Mid-Senior",
  },
  {
    company: "PostHog",
    position: "Product Engineer (Analytics & Feature Flags)",
    department: "Fullstack",
    startupStage: "Series B",
    location: "Remote (Global)",
    employmentType: "Full-time",
    salaryRange: "$155k - $200k • 0.15% - 0.35%",
    url: "https://posthog.com/careers",
    description:
      "PostHog is the all-in-one open-source developer product suite: analytics, session replay, feature flags, A/B testing, and surveys. We need a transparent, high-autonomy product engineer to ship features end-to-end.",
    requiredSkills: ["Python", "Django", "React", "TypeScript", "ClickHouse / SQL"],
    preferredSkills: ["Kafka", "Celery", "Open-source Contribution", "Data Pipelines"],
    responsibilities: [
      "Own full-stack features from customer feedback to database queries in ClickHouse and UI in React",
      "Design reliable event ingestion and querying for billions of events per day",
      "Work completely in the open with public GitHub PRs and transparent roadmap planning",
    ],
    keywords: ["Product Analytics", "ClickHouse", "Open Source", "Django", "Feature Flags", "Kafka"],
    seniority: "Senior",
  },
  {
    company: "Cursor (Anysphere)",
    position: "Founding Systems Engineer (AI Code Editor)",
    department: "Fullstack",
    startupStage: "Series A",
    location: "San Francisco, CA / Hybrid",
    employmentType: "Full-time",
    salaryRange: "$180k - $250k • 0.2% - 0.6%",
    url: "https://cursor.com/careers",
    description:
      "Cursor is building the AI-first code editor designed to make engineers 10x faster. We are seeking a Systems Engineer to craft multi-file codebase indexing, local language server protocols, and real-time code generation orchestration.",
    requiredSkills: ["TypeScript", "C++ or Rust", "Electron / Node.js", "Python"],
    preferredSkills: ["Language Server Protocol (LSP)", "Tree-sitter", "Embedding Search", "LLMs"],
    responsibilities: [
      "Build high-speed semantic codebase indexers with Tree-sitter and vector embeddings",
      "Orchestrate intelligent multi-file context retrieval and agentic code diffing algorithms",
      "Enhance core editor speed and minimize typing latency while streaming model completions",
    ],
    keywords: ["AI Editor", "Developer Tools", "Tree-sitter", "Code Intelligence", "Electron", "LSP"],
    seniority: "Staff / Founding",
  },
];

/**
 * Ensures the database contains the curated startup jobs.
 * Runs idempotently: only inserts if fewer than 5 curated jobs exist.
 */
export async function seedCuratedJobsIfEmpty() {
  try {
    const existingCount = await prisma.job.count({
      where: { isCurated: true },
    });

    if (existingCount >= CURATED_STARTUP_JOBS.length) {
      return { seeded: false, count: existingCount };
    }

    let seededCount = 0;
    for (const jobDef of CURATED_STARTUP_JOBS) {
      const existing = await prisma.job.findFirst({
        where: {
          company: jobDef.company,
          position: jobDef.position,
          isCurated: true,
        },
      });

      if (!existing) {
        const createdJob = await prisma.job.create({
          data: {
            company: jobDef.company,
            position: jobDef.position,
            department: jobDef.department,
            startupStage: jobDef.startupStage,
            location: jobDef.location,
            employmentType: jobDef.employmentType,
            salaryRange: jobDef.salaryRange,
            url: jobDef.url,
            description: jobDef.description,
            isCurated: true,
          },
        });

        // Pre-create pre-calculated JobAnalysis record
        await prisma.jobAnalysis.create({
          data: {
            jobId: createdJob.id,
            requiredSkills: JSON.stringify(jobDef.requiredSkills),
            preferredSkills: JSON.stringify(jobDef.preferredSkills),
            responsibilities: JSON.stringify(jobDef.responsibilities),
            keywords: JSON.stringify(jobDef.keywords),
            seniority: jobDef.seniority,
          },
        });

        seededCount++;
      }
    }

    return { seeded: true, count: seededCount };
  } catch (err) {
    console.error("Error seeding curated jobs:", err);
    return { seeded: false, error: String(err) };
  }
}
