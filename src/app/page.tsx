import { auth } from "@/auth";
import { HomeClient } from "@/components/home-client";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const session = await auth();

  if (session?.user) {
    redirect("/dashboard");
  }

  return <HomeClient />;
}
