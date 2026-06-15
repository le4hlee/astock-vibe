import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { SettingsClient } from "@/components/settings-client";

export default async function SettingsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <SettingsClient
      userName={session.user.name}
      userEmail={session.user.email}
    />
  );
}
