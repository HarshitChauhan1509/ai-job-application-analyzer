import { openai } from "./client";
import { InterviewQuestionsSchema, InterviewEvaluationSchema, InterviewQuestionsOutput, InterviewEvaluationOutput } from "./schema";

export async function generateInterviewQuestions(
  role: string, 
  difficulty: string, 
  numQuestions: number,
  categories: string[]
): Promise<InterviewQuestionsOutput> {
  const prompt = `
    You are an expert technical interviewer at a top-tier tech company.
    Generate a list of ${numQuestions} interview questions for a ${difficulty} level ${role}.
    Focus on these categories: ${categories.join(", ")}.
    Make the questions realistic, thought-provoking, and appropriate for the specified difficulty level.
  `;

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
  if (!content) throw new Error("No response from AI");

  try {
    return InterviewQuestionsSchema.parse(JSON.parse(content));
  } catch (error) {
    console.error("Failed to parse Interview Questions response", error, content);
    throw new Error("Invalid response format from AI");
  }
}

export async function evaluateInterviewAnswer(
  role: string,
  question: string,
  answer: string
): Promise<InterviewEvaluationOutput> {
  const prompt = `
    You are an expert technical interviewer evaluating a candidate for a ${role} position.
    
    Question asked: "${question}"
    
    Candidate's Answer: "${answer}"
    
    Evaluate the answer. Provide scores out of 10 for technical depth, communication clarity, 
    and specificity (using concrete examples). Provide actionable feedback, point out missing concepts,
    and suggest an ideal structure (like STAR method if behavioral). Optionally suggest a follow-up question.
  `;

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
  if (!content) throw new Error("No response from AI");

  try {
    return InterviewEvaluationSchema.parse(JSON.parse(content));
  } catch (error) {
    console.error("Failed to parse Interview Evaluation response", error, content);
    throw new Error("Invalid response format from AI");
  }
}
