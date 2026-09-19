"use server";

import { prisma } from "@/lib/db";
import { setSession, clearSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function loginUserAction(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "Email and password are required" };
  }

  // In a real app, use bcrypt to hash and compare passwords
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user || user.password !== password) {
    return { error: "Invalid email or password" };
  }

  await setSession(user.id);
  
  // Revalidate layout to update UI
  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function registerUserAction(formData: FormData) {
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password || !name) {
    return { error: "All fields are required" };
  }

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    return { error: "User already exists with this email" };
  }

  // In a real app, use bcrypt to hash password
  const user = await prisma.user.create({
    data: {
      name,
      email,
      password, // Storing plain text for this portfolio project mock
    },
  });

  await setSession(user.id);
  
  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function logoutUserAction() {
  await clearSession();
  revalidatePath("/", "layout");
  redirect("/login");
}
