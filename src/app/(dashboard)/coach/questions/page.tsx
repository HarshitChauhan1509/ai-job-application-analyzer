import { Metadata } from "next";
import { getQuestionBankAction } from "@/app/actions/questions-bank";
import { QuestionsClient } from "./questions-client";

export const metadata: Metadata = {
  title: "Company Interview Question Bank | CareerPilot",
  description:
    "Curated technical and behavioral interview questions asked at Stripe, Linear, Supabase, Vercel, and YC startups with model answers and AI Voice Coach practice.",
};

export default async function QuestionBankPage() {
  const res = await getQuestionBankAction();

  const initialData = res.data || {
    questions: [],
    totalCount: 0,
    companies: [],
    categories: [],
    difficulties: [],
  };

  return <QuestionsClient initialData={initialData} />;
}
