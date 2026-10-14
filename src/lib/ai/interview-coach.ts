import { openai } from "./client";
import { InterviewQuestionsSchema, InterviewEvaluationSchema, InterviewQuestionsOutput, InterviewEvaluationOutput } from "./schema";

function fallbackInterviewQuestions(role: string, difficulty: string, numQuestions: number, categories: string[]): InterviewQuestionsOutput {
  const pool = [
    { question: `How do you approach architecting scalable, maintainable systems for a ${role}?`, category: "System Design" },
    { question: "Describe a situation where you diagnosed and resolved a critical production bug under time constraints.", category: "Behavioral" },
    { question: "How do you evaluate trade-offs between performance optimization and code readability?", category: "Technical" },
    { question: "Can you explain how concurrency and asynchronous processing are managed in your preferred tech stack?", category: "Technical" },
    { question: "Tell me about a time when you had a technical disagreement with a team member. How was it resolved?", category: "Leadership" },
    { question: "How do you ensure robust test coverage, CI/CD automation, and zero-downtime deployments in your workflow?", category: "DevOps" },
  ];

  const questions = pool.slice(0, Math.min(numQuestions, pool.length)).map((item, idx) => ({
    id: `q${idx + 1}`,
    question: item.question,
    category: categories[idx % categories.length] || item.category,
  }));

  return { questions };
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
  categories: string[]
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

  return fallbackInterviewQuestions(role, difficulty, numQuestions, categories);
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
