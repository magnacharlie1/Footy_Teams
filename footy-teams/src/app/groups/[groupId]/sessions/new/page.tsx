import { notFound, redirect } from "next/navigation";

import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { prisma } from "@/lib/prisma";
import { createSessionAction } from "./actions";

type Props = {
  params: Promise<{ groupId: string }>;
};

export default async function NewSessionPage({ params }: Props) {
  const { groupId } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");

  const membership = await prisma.groupMember.findFirst({
    where: { groupId, userId: session.user.id, isActive: true },
  });
  if (!membership) notFound();

  return (
    <div className="container py-10">
      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle>New session</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form className="space-y-4" action={(formData) => createSessionAction(groupId, formData)}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="sessionDate">Date</Label>
                <Input id="sessionDate" name="sessionDate" type="date" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="numTeams">Teams (2 or 4)</Label>
                <Input id="numTeams" name="numTeams" type="number" min={2} max={4} step={2} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="paste">Paste WhatsApp poll/list</Label>
              <Textarea
                id="paste"
                name="paste"
                placeholder="Paste WhatsApp poll / list here"
                className="min-h-[160px]"
              />
            </div>
            <div className="flex justify-end">
              <Button type="submit">Create session</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
