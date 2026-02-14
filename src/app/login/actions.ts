"use server";

import { redirect } from "next/navigation";

import { setAuthSession, verifyLoginPassword } from "@/lib/auth";

export async function loginAction(formData: FormData): Promise<void> {
  const password = String(formData.get("password") ?? "").trim();

  if (!password) {
    redirect("/login?error=missing");
  }

  const isValid = await verifyLoginPassword(password);

  if (!isValid) {
    redirect("/login?error=invalid");
  }

  await setAuthSession();
  redirect("/patients");
}
