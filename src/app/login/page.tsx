import { Suspense } from "react";
import LoginForm from "./login-form";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto flex min-h-screen max-w-md items-center justify-center px-6">
          <p className="text-muted">Loading...</p>
        </main>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
