import "server-only";

import crypto from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const AUTH_COOKIE_NAME = "icu_isbar_auth";

function getPasswordFromEnv(): string {
  const password = process.env.LOCAL_PASSWORD;

  if (!password) {
    throw new Error("LOCAL_PASSWORD is not set. Add it to your .env file.");
  }

  return password;
}

function expectedAuthToken(): string {
  return crypto.createHash("sha256").update(getPasswordFromEnv()).digest("hex");
}

function timingSafeStringCompare(input: string, expected: string): boolean {
  const a = Buffer.from(input);
  const b = Buffer.from(expected);

  if (a.length !== b.length) {
    return false;
  }

  return crypto.timingSafeEqual(a, b);
}

export async function verifyLoginPassword(input: string): Promise<boolean> {
  return timingSafeStringCompare(input, getPasswordFromEnv());
}

export async function setAuthSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE_NAME, expectedAuthToken(), {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
}

export async function clearAuthSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  return token === expectedAuthToken();
}

export async function requireAuth(): Promise<void> {
  const authed = await isAuthenticated();

  if (!authed) {
    redirect("/login");
  }
}
