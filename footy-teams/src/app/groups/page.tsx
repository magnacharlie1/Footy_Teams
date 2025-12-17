import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function GroupsPage() {
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
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>Create your first group or join with an invite code.</p>
              <div className="flex gap-3">
                <Button asChild>
                  <Link href="/groups/new">Create group</Link>
                </Button>
                <Button variant="secondary" asChild>
                  <Link href="/join/demo">Try demo</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
