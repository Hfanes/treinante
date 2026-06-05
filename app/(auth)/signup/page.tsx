import Link from "next/link";
import { Card } from "@/components/ui";

export default function SignupPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Card
        className="w-full max-w-md"
        subtitle="Authentication flow will be implemented from PRD 01."
      >
        <h1 className="mb-2 text-xl font-semibold">Sign up</h1>
        <Link href="/login">Log in</Link>
      </Card>
    </main>
  );
}
