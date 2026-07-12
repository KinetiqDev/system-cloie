import { cookies } from "next/headers";

export const DEV_AUTH_COOKIE_NAME = "cloie_dev_auth";

type DevAuthCookiePayload = {
  email: string;
  userId: string;
};

export async function readDevAuthCookie(): Promise<DevAuthCookiePayload | null> {
  if (process.env.NODE_ENV !== "development") {
    return null;
  }

  const cookieStore = await cookies();
  const rawValue = cookieStore.get(DEV_AUTH_COOKIE_NAME)?.value;

  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue) as Partial<DevAuthCookiePayload>;

    if (typeof parsed.userId !== "string" || typeof parsed.email !== "string") {
      return null;
    }

    return {
      email: parsed.email,
      userId: parsed.userId,
    };
  } catch {
    return null;
  }
}
