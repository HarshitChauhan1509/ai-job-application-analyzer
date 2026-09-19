import { cookies } from "next/headers";
import { prisma } from "./db";

// Simple mock auth for portfolio
const SESSION_COOKIE = "careerpilot_session";

export async function setSession(userId: string) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, userId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function getSession() {
  const cookieStore = await cookies();
  const session = cookieStore.get(SESSION_COOKIE);
  return session?.value;
}

export async function getCurrentUser() {
  const userId = await getSession();
  if (!userId) return null;
  
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, image: true }
    });
    return user;
  } catch (error) {
    console.error("Error getting current user", error);
    return null;
  }
}
