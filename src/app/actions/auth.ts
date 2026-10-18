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

export async function loginWithGoogleAction() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (
    clientId &&
    clientSecret &&
    clientId !== "your-google-client-id" &&
    clientSecret !== "your-google-client-secret"
  ) {
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const redirectUri = `${baseUrl}/api/auth/callback/google`;
    const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(
      clientId
    )}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&response_type=code&scope=${encodeURIComponent(
      "openid email profile"
    )}&access_type=offline&prompt=consent`;

    redirect(googleAuthUrl);
  }

  // Fallback for local development/portfolio demo: instant Google user sign-in
  const demoEmail = "alex.morgan@gmail.com";
  let user = await prisma.user.findUnique({
    where: { email: demoEmail },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        name: "Alex Morgan",
        email: demoEmail,
        image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=faces",
        emailVerified: new Date(),
      },
    });
  }

  await setSession(user.id);
  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function logoutUserAction() {
  await clearSession();
  revalidatePath("/", "layout");
  redirect("/login");
}

export async function quickDevLoginAction() {
  let devUser = await prisma.user.findFirst({
    where: { email: "harshit@gmail.com" },
  });

  if (!devUser) {
    devUser = await prisma.user.findFirst({
      orderBy: { createdAt: "desc" },
    });
  }

  if (devUser) {
    await setSession(devUser.id);
    revalidatePath("/", "layout");
    redirect("/dashboard");
  } else {
    redirect("/login");
  }
}


