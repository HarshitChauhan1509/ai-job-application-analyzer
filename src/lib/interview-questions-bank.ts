/**
 * Curated Company-Specific Interview Question Bank
 * Real-world technical, system design, and behavioral interview questions
 * asked at top startups and tech companies (Linear, Stripe, Supabase, Vercel, etc.)
 */

export interface QuestionBankItem {
  id: string;
  company: string;
  companyTier: "Top Startup" | "Tech Unicorn" | "AI Frontier";
  companyColor: string;
  role: string;
  category: "System Design" | "Distributed Systems" | "Frontend & Architecture" | "Behavioral & Leadership" | "AI & Data Engineering";
  difficulty: "Junior" | "Mid" | "Senior" | "Staff";
  question: string;
  context: string;
  keyRubrics: string[];
  modelAnswerSummary: string;
  commonPitfalls: string[];
  estimatedMinutes: number;
  tags: string[];
}

export const QUESTION_BANK: QuestionBankItem[] = [
  // --- STRIPE ---
  {
    id: "stripe-idempotency",
    company: "Stripe",
    companyTier: "Tech Unicorn",
    companyColor: "indigo",
    role: "Staff Infrastructure Engineer",
    category: "Distributed Systems",
    difficulty: "Staff",
    question: "Design an end-to-end distributed idempotency key mechanism for high-throughput payment APIs to prevent double-charging during network timeouts and concurrent client retries.",
    context: "Stripe processes millions of financial transactions per minute where HTTP timeouts or client retry loops can accidentally duplicate charges if not guarded by strict idempotency guarantees.",
    keyRubrics: [
      "Client-generated Idempotency-Key header with UUIDv4 or UUIDv7 format.",
      "Atomic reservation using distributed lock / Redis with atomic SETNX and TTL.",
      "Database idempotency record storing request hash, response payload, and state (IN_PROGRESS vs COMPLETED).",
      "Handling concurrent in-flight requests: hold lock or return 409 Conflict / 429 Retry-After until first transaction commits.",
      "Payload hashing: reject requests with identical idempotency key but differing request bodies with 400 Bad Request.",
    ],
    modelAnswerSummary: "Start by explaining the life-cycle of an Idempotency-Key header. When received at the API gateway, compute SHA-256 hash of payload. Attempt atomic lock insertion in Redis with lease TTL. Check Postgres idempotency_records table: if COMPLETED, return cached HTTP status code and response payload immediately. If IN_PROGRESS, wait briefly or respond with 429 Retry-After. If record does not exist, insert IN_PROGRESS row within the primary payment database transaction. Commit charge, update record to COMPLETED, release Redis lock, and return payment receipt.",
    commonPitfalls: [
      "Storing idempotency purely in-memory (Redis) without a durable Postgres record, causing duplicates if Redis restarts.",
      "Ignoring payload mismatches where an attacker or faulty client sends different parameters with an existing key.",
      "Not handling lock timeouts when downstream banking processors take 15+ seconds to resolve.",
    ],
    estimatedMinutes: 8,
    tags: ["Stripe", "Payments", "Idempotency", "Postgres", "Redis", "Distributed Systems"],
  },
  {
    id: "stripe-zero-downtime-migrations",
    company: "Stripe",
    companyTier: "Tech Unicorn",
    companyColor: "indigo",
    role: "Senior Backend Engineer",
    category: "System Design",
    difficulty: "Senior",
    question: "How do you execute schema migrations on a billion-row transactions table with 5,000 queries per second without locking the table or incurring service downtime?",
    context: "In high-traffic financial ledgers, running naive ALTER TABLE statements acquires ACCESS EXCLUSIVE locks, stalling traffic and causing systemic payment timeouts.",
    keyRubrics: [
      "Expand-Contract (Parallel Run) migration pattern across multiple deployment phases.",
      "Adding columns: ensure nullable or default values that do not rewrite the entire table.",
      "Backfilling data: chunked asynchronous background workers throttling queries to avoid replication lag.",
      "Dual-writing: application writes to both old and new schema variants during transition.",
      "Safe dropping: read from new schema, stop dual writes, drop column only after extensive verification.",
    ],
    modelAnswerSummary: "Adopt the Expand and Contract pattern across 4 distinct deployments: 1) Expand: Add the new column without NOT NULL constraints or heavy locks (e.g., ADD COLUMN ... NULL). 2) Dual-Write: Deploy application code that reads from old column but writes simultaneously to both old and new columns. 3) Backfill: Run throttled background jobs in batches of 1,000-5,000 rows to populate historical records, monitoring PostgreSQL pg_stat_replication. 4) Contract: Switch reads to the new column, deprecate old write paths, and safely drop the old column in a later release.",
    commonPitfalls: [
      "Attempting single-transaction ALTER TABLE ADD COLUMN with volatile DEFAULT values on Postgres versions without fast defaults.",
      "Running massive background updates without pacing, causing database write locks and saturating CPU.",
    ],
    estimatedMinutes: 6,
    tags: ["Stripe", "Postgres", "Database Migrations", "High Concurrency", "Zero Downtime"],
  },

  // --- LINEAR ---
  {
    id: "linear-offline-sync",
    company: "Linear",
    companyTier: "Top Startup",
    companyColor: "purple",
    role: "Lead Full Stack / UI Architect",
    category: "Frontend & Architecture",
    difficulty: "Staff",
    question: "Architect an offline-first synchronization engine for an issue tracker where users can create, reorder, and edit issues offline and reconcile changes seamlessly upon reconnecting.",
    context: "Linear is acclaimed for instant sub-50ms local UI updates and resilient offline mode, synchronizing client-side local IndexedDB with central servers via WebSockets.",
    keyRubrics: [
      "Client-side local replica using IndexedDB or SQLite WASM for instant local reads and writes.",
      "Optimistic UI updates applied locally before server acknowledgement.",
      "Conflict Resolution: Last-Write-Wins (LWW) with Lamport timestamps or CRDTs (Conflict-free Replicated Data Types) for rich text and list ordering (Fractional Indexing).",
      "Persistent mutation outbox queue: serialize operations with clientUUID and replay in sequence over WebSocket upon reconnection.",
      "Server idempotency and delta synchronization via vector clocks or changelog sequence numbers.",
    ],
    modelAnswerSummary: "Structure the architecture into 3 layers: 1) Local State Store (IndexedDB) acting as the single source of truth for the React UI. 2) Mutation Queue: Every user action appends a serialized event to an indexed outbox with a local timestamp and client UUID. 3) Sync Manager: Maintains a persistent WebSocket connection. When online, flushes queued mutations. The server validates, applies mutations atomically, and broadcasts transactional changelogs with monotonic sequence IDs. For list ordering, use Fractional Indexing (string midpoints like 'a0' -> 'a05') to prevent reordering conflicts.",
    commonPitfalls: [
      "Using simple auto-increment integer indexes for drag-and-drop order, which causes collision cascades during concurrent reorders.",
      "Failing to handle outbox retry backoff when server returns business logic errors vs transient network drops.",
    ],
    estimatedMinutes: 8,
    tags: ["Linear", "Offline First", "CRDT", "IndexedDB", "WebSockets", "Optimistic UI"],
  },
  {
    id: "linear-keyboard-first-ux",
    company: "Linear",
    companyTier: "Top Startup",
    companyColor: "purple",
    role: "Senior Frontend Engineer",
    category: "Frontend & Architecture",
    difficulty: "Senior",
    question: "How would you design a global, keyboard-first Command Palette and shortcut management system in React that avoids event listener collisions and supports dynamic scoping?",
    context: "Linear's entire interface can be driven exclusively via keyboard shortcuts (e.g. 'c' for new issue, 'Cmd+K' for menu, 'j/k' for navigation), requiring granular focus management and accessibility.",
    keyRubrics: [
      "Centralized keyboard registry context / state machine rather than dispersed window.addEventListener calls.",
      "Contextual scoping: disable global single-key shortcuts when focus is inside text inputs, contentEditable, or modals.",
      "Sequence parsing: supporting multi-key chords (e.g. 'g i' for Go to Inbox, 'g b' for Go to Backlog).",
      "Full ARIA compliance (role='combobox', aria-expanded, aria-activedescendant for virtual lists).",
      "Fuzzy search algorithm (e.g. Smith-Waterman or fzf scoring) with weighted prioritization.",
    ],
    modelAnswerSummary: "Implement a centralized KeyboardProvider utilizing a custom Hook (useKeyboardShortcut) registering handlers into a priority tree. The root listener captures keydown events. It first inspects the active document element: if inside an INPUT or TEXTAREA, single-character shortcuts are bypassed unless explicitly flagged. For chords ('g i'), maintain a transient state buffer with a 500ms timeout window. For the Command Palette, render a virtualized list maintaining aria-activedescendant index for keyboard arrows, delegating selection to Enter.",
    commonPitfalls: [
      "Attaching dozens of individual window keydown listeners causing memory leaks and uncontrolled execution order.",
      "Hardcoding event.keyCode instead of modern event.key or event.code.",
    ],
    estimatedMinutes: 6,
    tags: ["Linear", "React", "Keyboard Shortcuts", "Command Palette", "Accessibility"],
  },

  // --- SUPABASE ---
  {
    id: "supabase-rls-multitenancy",
    company: "Supabase",
    companyTier: "Tech Unicorn",
    companyColor: "emerald",
    role: "Senior Database / Backend Engineer",
    category: "System Design",
    difficulty: "Senior",
    question: "Design a secure multi-tenant SaaS schema using PostgreSQL Row-Level Security (RLS). How do you optimize RLS policies to prevent table scans on large tables?",
    context: "Supabase allows developers to build production applications directly on Postgres RLS, requiring airtight tenant isolation without degrading query planning efficiency.",
    keyRubrics: [
      "Enabling RLS explicitly with ALTER TABLE ... ENABLE ROW LEVEL SECURITY; and FORCE ROW LEVEL SECURITY.",
      "JWT claim extraction: auth.uid() or current_setting('request.jwt.claims', true)::json->>'org_id'.",
      "Index optimization: creating composite B-Tree indexes on (org_id, ...) to match RLS WHERE clauses.",
      "Preventing subquery re-evaluations: wrapping lookups in STABLE functions or using WITH CHECK clauses efficiently.",
      "Separation of tenant data vs superuser bypass using service_role.",
    ],
    modelAnswerSummary: "In Postgres multi-tenancy, every tenant-scoped table includes tenant_id UUID NOT NULL REFERENCES organizations(id). Enable RLS with FORCE ROW LEVEL SECURITY. Define policies utilizing auth.jwt() ->> 'tenant_id'. To eliminate performance penalties, always index (tenant_id, created_at) so the Postgres query planner applies the filter as an index scan. For complex role-based queries (e.g. user is admin of org), write STABLE security definer helper functions so Postgres evaluates the permission check once per query statement rather than re-executing per row.",
    commonPitfalls: [
      "Calling volatile functions inside RLS policies which forces Postgres into a sequential scan across all rows.",
      "Forgetting to apply FORCE ROW LEVEL SECURITY, leaving table owners vulnerable to accidental data leakage.",
    ],
    estimatedMinutes: 7,
    tags: ["Supabase", "Postgres", "Row Level Security", "Multi-Tenancy", "Database Indexing"],
  },
  {
    id: "supabase-realtime-wal",
    company: "Supabase",
    companyTier: "Tech Unicorn",
    companyColor: "emerald",
    role: "Staff Platform Engineer",
    category: "Distributed Systems",
    difficulty: "Staff",
    question: "How does an engine like Supabase Realtime ingest PostgreSQL Write-Ahead Logs (WAL) via logical decoding and broadcast mutations to 100,000 connected WebSocket clients efficiently?",
    context: "Supabase Realtime translates database insertions and updates into live WebSocket events while enforcing tenant and row-level authorization in real time.",
    keyRubrics: [
      "PostgreSQL Logical Replication with pgoutput plugin and replication slots.",
      "Elixir/Phoenix or Go engine reading binary WAL stream and converting to JSON change payloads.",
      "Authorization at the edge: evaluating client subscription filters (e.g. table=todos:id=eq.123) before pushing to socket channels.",
      "Handling backpressure and connection limits: distributed pub/sub clusters using Phoenix PubSub or Redis cluster.",
      "Replication slot lag management to prevent Postgres disk saturation if consumers pause.",
    ],
    modelAnswerSummary: "Postgres maintains Write-Ahead Logs (WAL) for durability. A dedicated logical replication slot using pgoutput streams row mutations to an Elixir/Phoenix cluster. The cluster parses change events (INSERT, UPDATE, DELETE) and resolves record values. It evaluates subscriber topic filters. Clients connect via WebSockets to Phoenix channels; Phoenix's BEAM lightweight processes distribute messages across node clusters without thread overhead. A buffer pool manages backpressure to prevent message buildup if a client socket stalls.",
    commonPitfalls: [
      "Allowing an unconsumed replication slot to stay open, which stops Postgres from trimming WAL files and crashes the disk.",
      "Performing synchronous database authorization queries on every single WAL event instead of validating on channel join.",
    ],
    estimatedMinutes: 8,
    tags: ["Supabase", "PostgreSQL WAL", "Elixir", "WebSockets", "Streaming"],
  },

  // --- VERCEL ---
  {
    id: "vercel-edge-middleware",
    company: "Vercel",
    companyTier: "Tech Unicorn",
    companyColor: "sky",
    role: "Staff Frontend Infrastructure Engineer",
    category: "System Design",
    difficulty: "Staff",
    question: "Design an edge routing and A/B testing middleware that runs on globally distributed edge locations with sub-10ms overhead, ensuring consistent user bucket allocation and zero layout shift.",
    context: "Vercel Edge Middleware executes at Cloudflare / AWS edge PoPs before page rendering, allowing dynamic routing, authentication checks, and feature flag experimentation without origin server roundtrips.",
    keyRubrics: [
      "Edge runtime constraints (V8 isolates without Node.js native bindings, memory limits < 128MB).",
      "Deterministic cookie/header hashing (e.g. MurmurHash3 or FNV-1a on anonymous user ID).",
      "URL rewriting via NextResponse.rewrite to route traffic without HTTP 302 redirects (preventing flash of unstyled content / layout shift).",
      "Edge KV / Redis integration with in-memory caching and stale-while-revalidate for feature flag rules.",
      "Telemetry collection using non-blocking Edge waitUntil.",
    ],
    modelAnswerSummary: "Execute the middleware in V8 isolate environments running on edge PoPs. On request, inspect the signed session or anonymous visitor cookie. If absent, generate a UUIDv4 and set an HTTP-only cookie. Run deterministic MurmurHash on visitorId + experimentKey modulo 100 to allocate the variant (e.g. 0-49 Variant A, 50-99 Variant B). Rewrite the request URL using NextResponse.rewrite('/variants/b' + pathname) rather than redirecting, serving the cached edge asset instantly without client layout shifts. Dispatch analytics events asynchronously via event.waitUntil.",
    commonPitfalls: [
      "Making synchronous HTTP round-trips to distant origin databases inside edge middleware, negating the performance benefits of edge compute.",
      "Using client-side redirects for A/B testing which destroys SEO and introduces visual layout shifts.",
    ],
    estimatedMinutes: 7,
    tags: ["Vercel", "Edge Runtime", "Next.js", "A/B Testing", "CDN Caching"],
  },
  {
    id: "vercel-isr-caching",
    company: "Vercel",
    companyTier: "Tech Unicorn",
    companyColor: "sky",
    role: "Senior Full Stack Engineer",
    category: "Frontend & Architecture",
    difficulty: "Senior",
    question: "Explain the mechanics of Incremental Static Regeneration (ISR) and On-Demand Revalidation in Next.js. How do you handle cache invalidation race conditions across multiple edge regions?",
    context: "Vercel balances static speed with dynamic freshness through ISR, allowing millions of pages to be generated on-demand and cached globally.",
    keyRubrics: [
      "Stale-While-Revalidate HTTP caching headers and CDN behavior.",
      "Background regeneration triggered by first request after revalidate duration expires.",
      "On-demand revalidation using revalidatePath / revalidateTag via webhook or CMS mutation.",
      "Global shared cache layer (e.g. AWS S3 + Redis / KV) so edge PoPs don't redundantly recompute pages independently.",
      "Error handling: if background regeneration fails, continue serving stale page rather than showing 500 error.",
    ],
    modelAnswerSummary: "ISR decouples page generation from user traffic. When a page is rendered, the HTML/JSON payload is saved into a global durable cache and served with Stale-While-Revalidate headers. If a request arrives after revalidate seconds, the edge immediately serves the cached stale version to the user, while asynchronously firing a serverless task to regenerate the page. Once successfully generated, the global cache and edge PoPs are updated. For on-demand invalidation, revalidateTag purges tags across the global cache mesh.",
    commonPitfalls: [
      "Blocking the user request while waiting for background page rebuild instead of returning the stale cache immediately.",
      "Failing to catch errors in generateStaticParams or page render, causing the cache to drop into an error state.",
    ],
    estimatedMinutes: 6,
    tags: ["Vercel", "Next.js", "ISR", "Caching", "Serverless"],
  },

  // --- POSTHOG ---
  {
    id: "posthog-clickhouse-telemetry",
    company: "PostHog",
    companyTier: "Top Startup",
    companyColor: "amber",
    role: "Senior Data & Analytics Infrastructure Engineer",
    category: "AI & Data Engineering",
    difficulty: "Senior",
    question: "Design a high-volume event ingestion pipeline processing 100,000 analytics events per second into ClickHouse. How do you prevent small-batch insertion bottlenecks?",
    context: "PostHog processes billions of product analytics, session replays, and feature flag events using Apache Kafka and ClickHouse columnar storage.",
    keyRubrics: [
      "ClickHouse append-only columnar characteristics: optimal performance requires large batch inserts (10,000+ rows) rather than single-row writes.",
      "Buffering layer: Ingestion API pushes to Apache Kafka / Redpanda partitioned by team_id or distinct_id.",
      "Consumer workers flush to ClickHouse in micro-batches (e.g. every 5 seconds or every 50,000 events) using ReplacingMergeTree or CollapsingMergeTree engines.",
      "Dead-letter queues (DLQ) for malformed event JSON schemas.",
      "Data deduplication strategies using UUIDv7 or Kafka offsets.",
    ],
    modelAnswerSummary: "ClickHouse creates data parts for every insert batch; inserting row-by-row causes 'Too many parts' errors and crashes the cluster. The ingestion API must act as a lightweight proxy, quickly validating authorization and writing raw events into partitioned Kafka topics. Dedicated ingestion workers read from Kafka, accumulate records in-memory, and flush bulk batches (e.g., 20,000 events or 3-second intervals) into ClickHouse tables powered by ReplacingMergeTree. This guarantees high compression ratios and sub-second query response across billions of rows.",
    commonPitfalls: [
      "Connecting web APIs directly to ClickHouse to execute single INSERT statements.",
      "Failing to handle ClickHouse backpressure when disk I/O merges fall behind ingest rate.",
    ],
    estimatedMinutes: 8,
    tags: ["PostHog", "ClickHouse", "Kafka", "Data Engineering", "High Throughput"],
  },

  // --- RESEND ---
  {
    id: "resend-email-queue-deliverability",
    company: "Resend",
    companyTier: "Top Startup",
    companyColor: "pink",
    role: "Senior Backend / Infra Engineer",
    category: "System Design",
    difficulty: "Senior",
    question: "Architect a resilient transactional email delivery platform that handles sudden traffic spikes, enforces domain rate limits, and processes webhook callbacks with retry backoff.",
    context: "Resend provides high-speed email APIs where thousands of developers send verification codes, password resets, and marketing emails requiring instantaneous delivery and high deliverability scores.",
    keyRubrics: [
      "Asynchronous queuing: decoupled HTTP submission API returning 200 Accepted with message ID in <20ms.",
      "Priority queues: transactional OTPs/auth emails bypass bulk newsletter batches.",
      "Rate-limiting engine by sending IP and destination domain (e.g. Gmail rate limits vs Outlook rate limits) using Redis Token Bucket.",
      "DNS compliance verification (SPF, DKIM, DMARC) before outbound SMTP dispatch.",
      "Webhook event dispatcher with exponential backoff and HMAC-SHA256 signatures.",
    ],
    modelAnswerSummary: "Accept email payloads at a high-performance REST endpoint, validate domain authentication (DKIM/SPF cached in Redis), insert an initial 'queued' record, and publish to RabbitMQ or Redis Streams. Assign messages to priority queues so critical 2FA emails are not blocked behind 100,000-recipient marketing blasts. Workers pick up jobs and check destination domain throttles (Gmail allows X msgs/sec per IP) before connecting to outbound SMTP pools. As deliveries or bounces occur, enqueue webhook notification jobs with exponential backoff and signature headers.",
    commonPitfalls: [
      "Mixing transactional and bulk traffic into a single FIFO queue without priority tiering.",
      "Ignoring ISP-specific reputation limits (e.g. Yahoo/Gmail daily thresholds), causing sending IPs to be blacklisted.",
    ],
    estimatedMinutes: 7,
    tags: ["Resend", "Email Architecture", "Queues", "Rate Limiting", "Deliverability"],
  },

  // --- OPENAI & ANTHROPIC ---
  {
    id: "openai-rag-pipeline-chunking",
    company: "OpenAI",
    companyTier: "AI Frontier",
    companyColor: "teal",
    role: "Senior AI / LLM Systems Engineer",
    category: "AI & Data Engineering",
    difficulty: "Senior",
    question: "Design an enterprise RAG (Retrieval-Augmented Generation) pipeline over 1,000,000 confidential documents. How do you optimize chunking, embedding generation, and hybrid retrieval to minimize hallucination?",
    context: "Modern AI platforms require precise factual retrieval over massive unstructured knowledge bases while keeping inference latency under 1 second.",
    keyRubrics: [
      "Document preprocessing & semantic chunking: avoiding hard character splits; preserving headers and markdown hierarchies.",
      "Hybrid Search: combining Dense Vector Search (e.g. text-embedding-3-small via pgvector/Qdrant) with Sparse Keyword Search (BM25) using Reciprocal Rank Fusion (RRF).",
      "Re-ranking layer: using a cross-encoder model (e.g. Cohere Rerank) on top-20 retrieved chunks before prompt assembly.",
      "Metadata filtering: tenant isolation and document-level permission controls applied during vector search.",
      "Guardrails against hallucination: citations injection and relevance scoring thresholds.",
    ],
    modelAnswerSummary: "Start with semantic chunking that splits text along logical boundaries (paragraphs, markdown tables, sections) with a 15% sliding window overlap. Ingest chunks into a vector database (like pgvector or Qdrant) alongside metadata (tenantId, documentId, permissions). For retrieval, execute Hybrid Search: retrieve top-50 candidates via dense embeddings for semantic meaning and BM25 for exact keyword matches. Combine ranks using Reciprocal Rank Fusion (RRF). Pass top candidates through a Cross-Encoder Re-ranker to pick the top 5 most relevant passages. Format these passages into the system prompt with strict citation constraints.",
    commonPitfalls: [
      "Using arbitrary fixed-length character chunks (e.g. every 500 characters), which splits words, table rows, and key context in half.",
      "Relying solely on vector embeddings without keyword search, missing exact SKU numbers, error codes, and personal names.",
    ],
    estimatedMinutes: 8,
    tags: ["OpenAI", "RAG", "Vector Search", "Embeddings", "Hybrid Retrieval"],
  },

  // --- BEHAVIORAL & LEADERSHIP (YC FOUNDERS / TECH LEAD) ---
  {
    id: "yc-ambiguous-mvp-ship",
    company: "YC Startups",
    companyTier: "Top Startup",
    companyColor: "orange",
    role: "Full Stack Founding Engineer",
    category: "Behavioral & Leadership",
    difficulty: "Senior",
    question: "Describe a time when you had to ship a mission-critical product feature under severe ambiguity and a tight deadline without complete specifications. How did you decide what to cut and how did you communicate with stakeholders?",
    context: "Startup founders look for engineers who possess extreme agency and high velocity, capable of turning vague customer pain points into working software without waiting for a 20-page PRD.",
    keyRubrics: [
      "STAR framework structure: Situation, Task, Action, Result with quantified business outcomes.",
      "Demonstrating bias for action and customer empathy rather than analysis paralysis.",
      "Ruthless prioritization: distinguishing between P0 table-stakes vs P2 nice-to-haves.",
      "Proactive stakeholder communication: offering solutions with trade-offs rather than escalating problems.",
      "Post-launch iteration: instrumenting analytics and shipping immediate follow-up patches.",
    ],
    modelAnswerSummary: "Use the STAR model. Situation: At my previous company, our enterprise pilot was at risk because the client required automated data export within 5 days, but we lacked a formal export engine. Task: I was responsible for delivering a working solution before the contract deadline without compromising security. Action: I met directly with the customer lead to identify their core workflow—they only needed CSV transaction exports, not complex PDF generation or custom schedules. I scoped a lightweight queue job with pre-signed S3 download URLs. I communicated the trade-offs to the founders, cut the non-essential features, and set up test fixtures. Result: Shipped in 3 days, secured a $120k ARR contract, and later expanded the foundation into our full reporting engine.",
    commonPitfalls: [
      "Complaining about poor product management or missing documentation instead of taking proactive initiative.",
      "Over-engineering a massive generalized framework that failed to hit the urgent deadline.",
    ],
    estimatedMinutes: 5,
    tags: ["YC Startups", "STAR Method", "Behavioral", "Founding Engineer", "Leadership"],
  },
  {
    id: "yc-technical-disagreement",
    company: "YC Startups",
    companyTier: "Top Startup",
    companyColor: "orange",
    role: "Senior / Lead Engineer",
    category: "Behavioral & Leadership",
    difficulty: "Senior",
    question: "Tell me about a time you had a strong technical disagreement with a founder, CTO, or tech lead. How did you present your case, and what happened after a final decision was made?",
    context: "Founders value independent technical thinkers who stand up for architectural integrity using data, but who also practice 'disagree and commit' without lingering resentment.",
    keyRubrics: [
      "Focusing on business outcomes and developer velocity rather than dogmatic technology preferences.",
      "Bringing objective benchmarks, proof-of-concept prototypes, or data rather than emotional assertions.",
      "Respecting leadership perspective and acknowledging valid trade-offs.",
      "Demonstrating 'Disagree and Commit': executing the chosen path with 100% effort even if it wasn't your initial preference.",
      "Long-term post-mortem and team trust building.",
    ],
    modelAnswerSummary: "Frame using STAR. Situation: Our CTO proposed rewriting our backend in microservices to resolve database connection saturation, which I believed would add massive deployment complexity and delay our Q3 roadmap. Task: I needed to evaluate if our existing monolithic database could be optimized to sustain 10x current load without a 6-month rewrite. Action: Over a weekend, I profiled our Postgres slow query logs and built a proof-of-concept incorporating connection pooling (PgBouncer) and read-replica offloading for heavy queries. I presented a comparison document with latency benchmarks and cost projections. Result: The team adopted the connection pool solution, saving 4 months of engineering time while scaling throughput by 8x. The CTO commended the data-driven approach.",
    commonPitfalls: [
      "Framing the disagreement as personal or attacking the other person's competence.",
      "Passive-aggressively refusing to support the final decision if their proposal wasn't chosen.",
    ],
    estimatedMinutes: 5,
    tags: ["YC Startups", "STAR Method", "Conflict Resolution", "Disagree & Commit", "Leadership"],
  },
  {
    id: "linear-ui-performance-60fps",
    company: "Linear",
    companyTier: "Top Startup",
    companyColor: "purple",
    role: "Frontend Performance Specialist",
    category: "Frontend & Architecture",
    difficulty: "Senior",
    question: "How do you maintain continuous 60 FPS rendering in a complex React application with thousands of active DOM nodes, animated state transitions, and real-time cursor updates?",
    context: "Linear treats UI responsiveness and buttery 60 FPS performance as a primary product feature, demanding deep mastery over the browser rendering pipeline.",
    keyRubrics: [
      "Bypassing React state reconciler for high-frequency updates (e.g. transient animations, live mouse positions) using direct CSS transform / canvas / WebGL.",
      "Virtualization of lists: windowing long lists using @tanstack/react-virtual to render only visible viewport elements.",
      "Understanding browser compositor thread: animating strictly transform and opacity to avoid Layout (Reflow) and Paint.",
      "Profiling with Chrome DevTools Performance tab and React DevTools Profiler to eliminate unnecessary re-renders.",
      "Memoization strategy: proper placement of React.memo, useMemo, and useCallback.",
    ],
    modelAnswerSummary: "Break down into 3 strategies: 1) DOM Virtualization: Never mount thousands of nodes; use windowing to render only the 30-50 elements visible on screen. 2) Compositor Thread Animations: Animate exclusively using CSS transform (translate3d) and opacity so changes run on the GPU compositor thread without triggering layout re-calculation or repainting. 3) Transient State Management: For 60-120 FPS cursor or drag interactions, bypass React's standard setState/render loop entirely. Use mutable refs or raw DOM style updates via requestAnimationFrame, synchronizing back into React state only upon gesture completion.",
    commonPitfalls: [
      "Triggering layout reflows inside requestAnimationFrame loops by reading layout properties (e.g. offsetTop, getBoundingClientRect) immediately before writing styles.",
      "Using CSS top/left animations instead of transform3d.",
    ],
    estimatedMinutes: 6,
    tags: ["Linear", "React Performance", "60 FPS", "Virtualization", "Browser Rendering"],
  },
  {
    id: "stripe-fraud-risk-scoring",
    company: "Stripe",
    companyTier: "Tech Unicorn",
    companyColor: "indigo",
    role: "Senior Machine Learning / Platform Engineer",
    category: "AI & Data Engineering",
    difficulty: "Staff",
    question: "Design a low-latency fraud detection scoring pipeline (Radar) that evaluates transactions within a strict 50ms p99 SLA before authorizing credit card charges.",
    context: "Stripe Radar inspects every incoming charge across global card networks to block fraudulent payments in real-time without introducing perceptible checkout latency.",
    keyRubrics: [
      "Strict p99 latency budgeting: 50ms total breakdown (network: 15ms, feature extraction: 15ms, model inference: 15ms, margin: 5ms).",
      "Feature store: low-latency in-memory cache (Redis/Aerospike) pre-aggregating card velocity, geolocation distance, and IP reputation.",
      "Model inference: lightweight gradient boosted decision trees (XGBoost/LightGBM) or quantized ONNX models running in-process via C++ bindings.",
      "Graceful degradation: if feature lookup or model inference exceeds deadline, fall back to safe rule-based heuristic with async alerting.",
      "Dual-write shadow testing for model retraining without risk.",
    ],
    modelAnswerSummary: "Implement an in-memory feature retrieval service paired with an embedded inference runtime. When a charge initiates, concurrently fetch pre-calculated features (e.g., transactions from card in last 1 hour, device fingerprint risk score) from distributed Aerospike/Redis with a 15ms timeout. Pass normalized feature vectors into an in-process ONNX or XGBoost model (under 5ms execution time) rather than making RPC calls to remote Python services. If any component exceeds the deadline, trigger a circuit-breaker fallback to baseline heuristics (AVS address match, CVV match). Return score: Block, 3D-Secure Challenge, or Approve.",
    commonPitfalls: [
      "Calling external remote REST microservices during synchronous payment authorization paths, causing latency spikes.",
      "Failing to implement circuit breakers, causing payment checkout failures whenever the ML service has elevated response times.",
    ],
    estimatedMinutes: 8,
    tags: ["Stripe", "Fraud Detection", "Low Latency", "Machine Learning", "High Reliability"],
  },
];
