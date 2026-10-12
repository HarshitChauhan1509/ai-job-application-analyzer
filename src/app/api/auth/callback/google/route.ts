import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { setSession } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error || !code) {
    const errorMsg = error || "Google authentication failed";
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(errorMsg)}`, request.url));
  }

  try {
    const clientId = process.env.GOOGLE_CLIENT_ID!;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET!;
    const baseUrl = process.env.NEXTAUTH_URL || request.nextUrl.origin;
    const redirectUri = `${baseUrl}/api/auth/callback/google`;

    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    const tokenData = await tokenResponse.json();
    if (!tokenResponse.ok || !tokenData.access_token) {
      console.error("Failed to exchange Google token:", tokenData);
      return NextResponse.redirect(new URL("/login?error=Failed+to+exchange+Google+token", request.url));
    }

    const userinfoResponse = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    const profile = await userinfoResponse.json();
    if (!profile.email) {
      return NextResponse.redirect(new URL("/login?error=Google+profile+missing+email", request.url));
    }

    let user = await prisma.user.findUnique({
      where: { email: profile.email },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          name: profile.name || profile.email.split("@")[0],
          email: profile.email,
          image: profile.picture || null,
          emailVerified: profile.email_verified ? new Date() : null,
        },
      });
    } else if (profile.picture && !user.image) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { image: profile.picture },
      });
    }

    await setSession(user.id);
    return NextResponse.redirect(new URL("/dashboard", request.url));
  } catch (err) {
    console.error("Error in Google OAuth callback:", err);
    return NextResponse.redirect(new URL("/login?error=OAuth+callback+error", request.url));
  }
}
