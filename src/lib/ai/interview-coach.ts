import { openai } from "./client";
import { InterviewQuestionsSchema, InterviewEvaluationSchema, InterviewQuestionsOutput, InterviewEvaluationOutput } from "./schema";

function fallbackInterviewQuestions(
  role: string, 
  difficulty: string, 
  numQuestions: number, 
  categories: string[],
  jobContext?: string
): InterviewQuestionsOutput {
  const categoryPool: Record<string, string[]> = {
    "JavaScript": [
      "Can you explain the JavaScript Event Loop, microtasks vs macrotasks, and how asynchronous code executes?",
      "How do JavaScript closures work, and what are practical use cases or memory leak pitfalls with them?",
      "Explain the prototype chain in JavaScript and how ES6 classes differ under the hood."
    ],
    "React": [
      "Explain how React's reconciliation algorithm and Virtual DOM diffing work to optimize re-renders.",
      "When and why would you use useMemo, useCallback, or React.memo, and how do you avoid premature optimization?",
      "How do Server Components and Client Components interact in modern React / Next.js architectures?"
    ],
    "Node.js": [
      "How does Node.js handle CPU-intensive tasks without blocking the main event loop?",
      "What are the best practices for stream processing and memory management when handling large payloads in Node.js?",
      "How do you design graceful shutdown, connection pooling, and error handling in a production Node.js service?"
    ],
    "System Design": [
      `How would you design a highly available, fault-tolerant system for a ${role}?`,
      "How do you approach database sharding, replication lag, and caching strategies (like Cache-Aside vs Write-Through)?",
      "Explain how you would design a distributed rate limiter or message queue worker system."
    ],
    "Behavioral": [
      "Tell me about a time when you diagnosed and resolved a critical production incident under tight time constraints.",
      "Describe a situation where you had a significant technical disagreement with a colleague or manager. How was it resolved?",
      "Tell me about a project where requirements changed midway. How did you adapt and ensure delivery?"
    ],
    "HR": [
      `What motivated you to pursue this ${role} position, and what are your key career goals over the next 2-3 years?`,
      "How do you manage your time and prioritize when balancing multiple competing deadlines?",
      "Describe your ideal team culture and what kind of engineering environment helps you do your best work."
    ],
    "Leadership": [
      "How do you mentor junior and mid-level engineers and foster high engineering standards in your team?",
      "Describe how you break down vague, ambiguous business requirements into actionable engineering sprints.",
      "How do you build consensus across engineering, product, and design when trade-offs must be made?"
    ],
    "DevOps": [
      "How do you structure CI/CD pipelines, automated testing gates, and canary deployments to minimize deployment risk?",
      "What observability, logging, and metrics setup do you rely on to quickly debug production regressions?",
      "How do you handle secrets management and environment isolation across staging and production clusters?"
    ]
  };

  const selectedCategories = categories.length > 0 ? categories : ["System Design", "Behavioral", "Technical"];
  const questions: { id: string; question: string; category: string }[] = [];

  // If job context is provided, construct a question focused on the specific job requirements
  if (jobContext) {
    const jobSnippet = jobContext.slice(0, 120).replace(/\n/g, " ");
    questions.push({
      id: "q1",
      question: `Based on the target job requirements ("${jobSnippet}..."), how does your past experience align with these core technical responsibilities?`,
      category: selectedCategories[0] || "Technical Alignment",
    });
  }

  // Pick questions from the selected categories
  let catIndex = 0;
  while (questions.length < numQuestions) {
    const cat = selectedCategories[catIndex % selectedCategories.length];
    const poolForCat = categoryPool[cat] || [
      `How do you approach complex problem-solving and architectural choices in ${cat}?`,
      `What are the most challenging technical obstacles you've overcome in ${cat}?`,
      `How do you ensure code quality, maintainability, and test coverage for ${cat}?`
    ];

    const questionText = poolForCat[Math.floor(questions.length / selectedCategories.length) % poolForCat.length];
    
    // Avoid duplicate questions
    if (!questions.some(q => q.question === questionText)) {
      questions.push({
        id: `q${questions.length + 1}`,
        question: questionText,
        category: cat
      });
    } else {
      questions.push({
        id: `q${questions.length + 1}`,
        question: `In the context of ${cat} for a ${difficulty} ${role}, how do you tackle scalability, trade-offs, and failure recovery?`,
        category: cat
      });
    }

    catIndex++;
    if (questions.length >= numQuestions) break;
  }

  return { questions: questions.slice(0, numQuestions) };
}

function fallbackInterviewEvaluation(role: string, question: string, answer: string): InterviewEvaluationOutput {
  const words = answer.trim().split(/\s+/).length;
  const technical = Math.min(Math.max(Math.round(words / 15), 5), 9);
  const communication = Math.min(Math.max(Math.round(words / 18), 6), 9);
  const specificity = answer.includes("for example") || answer.includes("specifically") || /\d+/.test(answer) ? 8 : 6;
  const overall = Math.round((technical + communication + specificity) / 3);

  return {
    scores: {
      technical,
      communication,
      specificity,
      overall,
    },
    strengths: [
      "Directly addressed the core premise of the prompt",
      "Demonstrated logical flow and structured technical thinking",
      "Communicated solution reasoning effectively",
    ],
    weaknesses: [
      "Could elaborate further on edge cases and failure modes",
      "Consider using the STAR (Situation, Task, Action, Result) methodology with quantified metrics",
    ],
    missingConcepts: [
      "Trade-off analysis between alternative architectural approaches",
      "Observability and monitoring strategies in production",
    ],
    idealStructure: "1. Clarify constraints -> 2. Propose high-level design -> 3. Drill into trade-offs and edge cases -> 4. Summarize with quantifiable outcomes.",
    followUpQuestion: `How would your proposed strategy scale if traffic or data volume multiplied by 10x?`,
  };
}

export async function generateInterviewQuestions(
  role: string, 
  difficulty: string, 
  numQuestions: number,
  categories: string[],
  jobContext?: string
): Promise<InterviewQuestionsOutput> {
  const hasValidKey =
    process.env.OPENAI_API_KEY &&
    !process.env.OPENAI_API_KEY.startsWith("dummy") &&
    process.env.OPENAI_API_KEY !== "your-openai-api-key";

  if (hasValidKey) {
    const prompt = `
      You are an expert technical interviewer at a top-tier tech company.
      Generate a list of ${numQuestions} interview questions for a ${difficulty} level ${role}.
      Focus on these categories: ${categories.join(", ")}.
      ${jobContext ? `Base the questions on this job description and its specific requirements:\n${jobContext}` : ""}
      Make the questions realistic, thought-provoking, and appropriate for the specified difficulty level.
    `;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4-turbo",
        messages: [
          {
            role: "system",
            content: `You are an interview generation engine. Always respond in valid JSON matching this exact structure:
            {
              "questions": [
                {
                  "id": "q1",
                  "question": "How would you scale a Node.js application?",
                  "category": "Architecture"
                }
              ]
            }`,
          },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
      });

      const content = response.choices[0].message.content;
      if (content) {
        return InterviewQuestionsSchema.parse(JSON.parse(content));
      }
    } catch (error) {
      console.warn("OpenAI API call failed, falling back to heuristic question generator:", error);
    }
  }

  return fallbackInterviewQuestions(role, difficulty, numQuestions, categories, jobContext);
}

export async function evaluateInterviewAnswer(
  role: string,
  question: string,
  answer: string
): Promise<InterviewEvaluationOutput> {
  const hasValidKey =
    process.env.OPENAI_API_KEY &&
    !process.env.OPENAI_API_KEY.startsWith("dummy") &&
    process.env.OPENAI_API_KEY !== "your-openai-api-key";

  if (hasValidKey) {
    const prompt = `
      You are an expert technical interviewer evaluating a candidate for a ${role} position.
      
      Question asked: "${question}"
      
      Candidate's Answer: "${answer}"
      
      Evaluate the answer. Provide scores out of 10 for technical depth, communication clarity, 
      and specificity (using concrete examples). Provide actionable feedback, point out missing concepts,
      and suggest an ideal structure (like STAR method if behavioral). Optionally suggest a follow-up question.
    `;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4-turbo",
        messages: [
          {
            role: "system",
            content: `You are an interview evaluation engine. Always respond in valid JSON matching this exact structure:
            {
              "scores": { "technical": 8, "communication": 7, "specificity": 6, "overall": 7 },
              "strengths": ["Clear explanation"],
              "weaknesses": ["Lacks concrete examples"],
              "missingConcepts": ["Database indexing"],
              "idealStructure": "Start with the problem, explain the options...",
              "followUpQuestion": "How would this change if read volume increased 100x?"
            }`,
          },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.2,
      });

      const content = response.choices[0].message.content;
      if (content) {
        return InterviewEvaluationSchema.parse(JSON.parse(content));
      }
    } catch (error) {
      console.warn("OpenAI API call failed, falling back to heuristic answer evaluator:", error);
    }
  }

  return fallbackInterviewEvaluation(role, question, answer);
}
