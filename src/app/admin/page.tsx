import { redirect } from "next/navigation";
import { savePartySettings } from "@/app/admin/actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { createSql, getOrCreatePartySettings } from "@/lib/admin";
import { getCurrentAdminSession } from "@/lib/admin-session";
import { formatStockholmDateTimeLocal } from "@/lib/stockholm-datetime";

type AdminPageProps = {
  searchParams?: Promise<{ saved?: string }>;
};

export default async function AdminPage({ searchParams }: AdminPageProps) {
  if (!(await getCurrentAdminSession())) {
    redirect("/admin/login");
  }

  const params = await searchParams;
  const settings = await getOrCreatePartySettings(createSql());

  return (
    <main className="min-h-dvh bg-background px-6 py-8 text-foreground">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <header className="flex flex-col gap-2">
          <p className="text-sm font-medium text-muted-foreground">
            Admin View
          </p>
          <h1 className="text-3xl font-semibold tracking-normal">
            Party Settings
          </h1>
        </header>

        {params?.saved === "1" ? (
          <Alert>
            <AlertTitle>Saved</AlertTitle>
            <AlertDescription>Party Settings saved.</AlertDescription>
          </Alert>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>Structured invitation content</CardTitle>
            <CardDescription>
              These fields drive the guest-facing invitation and late-response
              behavior.
            </CardDescription>
          </CardHeader>
          <form action={savePartySettings} className="flex flex-col gap-6">
            <CardContent>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="title">Title</FieldLabel>
                  <Input
                    id="title"
                    name="title"
                    defaultValue={settings.title}
                    required
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="startsAt">Date and time</FieldLabel>
                  <Input
                    id="startsAt"
                    name="startsAt"
                    type="datetime-local"
                    defaultValue={formatStockholmDateTimeLocal(
                      settings.startsAt,
                    )}
                    required
                  />
                  <FieldDescription>
                    Enter the party start in Europe/Stockholm time.
                  </FieldDescription>
                </Field>
                <Field>
                  <FieldLabel htmlFor="location">
                    Location and logistics
                  </FieldLabel>
                  <Textarea
                    id="location"
                    name="location"
                    defaultValue={settings.location}
                    required
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="dressCode">Dress code</FieldLabel>
                  <Input
                    id="dressCode"
                    name="dressCode"
                    defaultValue={settings.dressCode}
                    required
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="publicInfo">
                    Public Party Info
                  </FieldLabel>
                  <Textarea
                    id="publicInfo"
                    name="publicInfo"
                    defaultValue={settings.publicInfo}
                    required
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="confirmedInfo">
                    Confirmed Party Info
                  </FieldLabel>
                  <Textarea
                    id="confirmedInfo"
                    name="confirmedInfo"
                    defaultValue={settings.confirmedInfo}
                    required
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="lateResponsePolicy">
                    Late Response Policy
                  </FieldLabel>
                  <NativeSelect
                    id="lateResponsePolicy"
                    name="lateResponsePolicy"
                    defaultValue={settings.lateResponsePolicy}
                    className="w-full"
                  >
                    <NativeSelectOption value="decline_late">
                      Decline late Yes responses
                    </NativeSelectOption>
                    <NativeSelectOption value="accept_late">
                      Accept late Yes responses
                    </NativeSelectOption>
                  </NativeSelect>
                </Field>
              </FieldGroup>
            </CardContent>
            <CardFooter>
              <Button type="submit">Save Party Settings</Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </main>
  );
}
