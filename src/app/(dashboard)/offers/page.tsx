import { Metadata } from "next";
import { getUserOffersAction } from "@/app/actions/compensation";
import { OffersClient } from "./offers-client";

export const metadata: Metadata = {
  title: "Offer Evaluator & Negotiation Strategist | CareerPilot",
  description:
    "Evaluate job offers, model Total Compensation (TC) and startup equity scenarios, and generate AI counter-offer pitch scripts.",
};

export default async function OffersPage() {
  const res = await getUserOffersAction();
  const offers = res.offers || [];

  return <OffersClient initialOffers={offers} />;
}
