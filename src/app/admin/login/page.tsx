import { LogIn } from "lucide-react";
import { redirect } from "next/navigation";
import { loginAdmin } from "@/app/admin/actions";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { getCurrentAdminSession } from "@/lib/admin-session";

type LoginPageProps = {
  searchParams?: Promise<{ error?: string }>;
};

export default async function AdminLoginPage({ searchParams }: LoginPageProps) {
  if (await getCurrentAdminSession()) {
    redirect("/admin");
  }

  const params = await searchParams;
  const hasInvalidPassword = params?.error === "invalid";

  return (
    <main className="flex min-h-dvh items-center justify-center bg-muted/30 px-6 py-10 text-foreground">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">Admin login</CardTitle>
          <CardDescription>Enter the host password.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={loginAdmin} className="flex flex-col gap-5">
            <FieldGroup>
              <Field data-invalid={hasInvalidPassword}>
                <FieldLabel htmlFor="password">Password</FieldLabel>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  aria-invalid={hasInvalidPassword}
                  aria-describedby={
                    hasInvalidPassword ? "password-error" : undefined
                  }
                  autoComplete="current-password"
                  required
                />
              </Field>
            </FieldGroup>
            {hasInvalidPassword ? (
              <Alert variant="destructive">
                <AlertTitle>Login failed</AlertTitle>
                <AlertDescription id="password-error">
                  The password did not match the configured admin password.
                </AlertDescription>
              </Alert>
            ) : null}
            <PendingSubmitButton pendingLabel="Logging in...">
              <LogIn />
              Log in
            </PendingSubmitButton>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
