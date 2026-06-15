import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { DashboardClient } from "@/components/dashboard-client";
import { buildPortfolioSummary } from "@/lib/portfolio";
import { prisma } from "@/lib/prisma";

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const holdings = await prisma.holding.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  const initialPortfolio = await buildPortfolioSummary(holdings, "USD");

  return (
    <DashboardClient
      userName={session.user.name}
      userEmail={session.user.email}
      initialPortfolio={initialPortfolio}
    />
  );
}
