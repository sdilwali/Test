import Onboarding from "@/components/onboarding/Onboarding";
import { getRepository } from "@/data/repository";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const household = await getRepository().getHousehold();
  return <Onboarding forwardAddress={household.forwardAddress} />;
}
