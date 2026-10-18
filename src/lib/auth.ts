import { cookies } from "next/headers";
import { prisma } from "./db";

// Simple persistent auth with dev auto-login
const SESSION_COOKIE = "careerpilot_session";
const LOGGED_OUT_COOKIE = "careerpilot_logged_out";
const THIRTY_DAYS_SEC = 60 * 60 * 24 * 30; // 30 days

export async function setSession(userId: string) {
  const cookieStore = await cookies();
  try {
    cookieStore.delete(LOGGED_OUT_COOKIE);
  } catch {
    // Ignore in environments where delete isn't permissible
  }

  cookieStore.set(SESSION_COOKIE, userId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: THIRTY_DAYS_SEC,
    expires: new Date(Date.now() + THIRTY_DAYS_SEC * 1000),
  });
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  cookieStore.set(LOGGED_OUT_COOKIE, "1", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24, // 1 day
    expires: new Date(Date.now() + 60 * 60 * 24 * 1000),
  });
}

export async function getSession() {
  const cookieStore = await cookies();
  const session = cookieStore.get(SESSION_COOKIE);
  return session?.value;
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE);
  const isExplicitlyLoggedOut = cookieStore.get(LOGGED_OUT_COOKIE)?.value === "1";
  const userId = sessionCookie?.value;

  if (userId) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, email: true, image: true },
      });
      if (user) return user;
    } catch (error) {
      console.error("Error getting current user by session id", error);
    }
  }

  // In development, if not explicitly logged out and no active session found,
  // automatically authenticate as the primary developer account (Harshit Chauhan)
  // so that stopping/starting npm run dev never forces a re-login.
  if (process.env.NODE_ENV === "development" && !isExplicitlyLoggedOut) {
    try {
      let devUser = await prisma.user.findFirst({
        where: { email: "harshit@gmail.com" },
        select: { id: true, name: true, email: true, image: true },
      });

      if (!devUser) {
        devUser = await prisma.user.findFirst({
          orderBy: { createdAt: "desc" },
          select: { id: true, name: true, email: true, image: true },
        });
      }

      if (devUser) {
        try {
          cookieStore.set(SESSION_COOKIE, devUser.id, {
            httpOnly: true,
            secure: false,
            sameSite: "lax",
            path: "/",
            maxAge: THIRTY_DAYS_SEC,
            expires: new Date(Date.now() + THIRTY_DAYS_SEC * 1000),
          });
        } catch {
          // In Server Components GET renders, cookieStore.set can throw.
          // Returning devUser ensures authentication succeeds smoothly regardless.
        }
        return devUser;
      }
    } catch (error) {
      console.error("Error finding fallback dev user:", error);
    }
  }

  return null;
}
