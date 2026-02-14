"use server";

import { redirect } from "next/navigation";

import { clearAuthSession } from "@/lib/auth";

export async function logoutAction(): Promise<void> {
  await clearAuthSession();
  redirect("/login");
}
