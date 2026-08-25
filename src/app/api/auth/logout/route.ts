import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSiteUrlFromRequest } from "@/lib/utils/site-url";
import { CI_TEST_AUTH_COOKIE_NAME } from "@/features/auth/services/ci-test-auth";
import { DEV_AUTH_COOKIE_NAME } from "@/features/auth/services/dev-auth";
import { DEMO_AUTH_COOKIE_NAME } from "@/features/auth/services/demo-auth";
export async function POST(request: Request) {
  const supabase = await createClient();

  const siteUrl = getSiteUrlFromRequest(request);

  await supabase.auth.signOut();
  const cookieStore = await cookies();
  cookieStore.delete(DEV_AUTH_COOKIE_NAME);
  cookieStore.delete(CI_TEST_AUTH_COOKIE_NAME);
  cookieStore.delete(DEMO_AUTH_COOKIE_NAME);

  // Return to portal page after logout
  return NextResponse.redirect(`${siteUrl}/portal/respondents`);
}

export async function GET(request: Request) {
  return POST(request);
}
