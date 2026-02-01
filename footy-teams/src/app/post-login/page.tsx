import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { needsProfileName } from "@/lib/player-name";

type Props = {
  searchParams?: { next?: string };
};

function sanitizeNext(value?: string) {
  if (!value) return "/groups";
  if (!value.startsWith("/")) return "/groups";
  if (value.startsWith("/login") || value.startsWith("/post-login")) return "/groups";
  return value;
}

export default async function PostLoginPage({ searchParams }: Props) {
  const session = await auth();
  const nextPath = sanitizeNext(searchParams?.next);

  if (!session?.user) {
    redirect(`/login?callbackUrl=${encodeURIComponent(`/post-login?next=${nextPath}`)}`);
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true },
  });

  if (needsProfileName(user?.name)) {
    redirect("/profile");
  }

  redirect(nextPath);
}
