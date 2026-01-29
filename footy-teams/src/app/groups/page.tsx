import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { joinGroupByCodeAction } from "./actions";

export const dynamic = "force-dynamic";

type Props = {
  searchParams?: { joinError?: string };
};

export default async function GroupsPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const memberships = await prisma.groupMember.findMany({
    where: { userId: session.user.id, isActive: true },
    include: { group: true },
    orderBy: { group: { name: "asc" } },
  });

  const groups = memberships.map((m) => m.group);
  const joinError = searchParams?.joinError;
  const joinErrorMessage =
    joinError === "missing"
      ? "Enter a join code."
      : joinError === "invalid"
        ? "That invite code is invalid or inactive."
        : null;

  return (
    <div className="container py-8">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-primary">Groups</p>
          <h1 className="text-2xl font-semibold">Your football groups</h1>
        </div>
        <Button asChild>
          <Link href="/groups/new">Create group</Link>
        </Button>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {groups.map((group) => (
          <Card key={group.id}>
            <CardHeader>
              <CardTitle className="text-lg">{group.name}</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                {group.timezone} · Default day {group.defaultDayOfWeek ?? "n/a"}
              </div>
              <Button variant="secondary" size="sm" asChild>
                <Link href={`/groups/${group.id}`}>Open</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
        {groups.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Welcome! No groups yet.</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <p>Create your first group or join with an invite code.</p>
              <Button asChild>
                <Link href="/groups/new">Create group</Link>
              </Button>
            </CardContent>
          </Card>
        ) : null}
        <Card>
          <CardHeader>
            <CardTitle>Join a group</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>Paste an invite code to join another group.</p>
            {joinErrorMessage ? (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {joinErrorMessage}
              </div>
            ) : null}
            <form action={joinGroupByCodeAction} className="flex flex-col gap-2 sm:flex-row">
              <Input
                name="code"
                placeholder="Enter invite code or link"
                className="sm:max-w-xs"
              />
              <Button type="submit" variant="secondary">
                Join group
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
