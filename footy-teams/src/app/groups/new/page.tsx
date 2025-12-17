import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { createGroupAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function NewGroupPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="container py-10">
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Create a group</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" action={createGroupAction}>
            <div className="space-y-2">
              <Label htmlFor="name">Group name</Label>
              <Input id="name" name="name" required placeholder="Charlies Monday Football" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="timezone">Timezone</Label>
              <Input id="timezone" name="timezone" defaultValue="Europe/London" required />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="defaultDayOfWeek">Default day (0=Sun)</Label>
                <Input id="defaultDayOfWeek" name="defaultDayOfWeek" type="number" min={0} max={6} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="defaultStartTimeHHMM">Start time (HH:MM)</Label>
                <Input id="defaultStartTimeHHMM" name="defaultStartTimeHHMM" placeholder="18:30" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="defaultDurationMinutes">Duration (mins)</Label>
                <Input
                  id="defaultDurationMinutes"
                  name="defaultDurationMinutes"
                  type="number"
                  min={30}
                  max={240}
                  placeholder="60"
                />
              </div>
            </div>
            <Button type="submit">Create group</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
