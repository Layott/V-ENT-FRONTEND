"use server";

import { z } from "zod";
import { redirect } from "next/navigation";

// ✅ SCHEMA: Keep schema validation
const loginSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }).trim(),
  password: z
    .string()
    .min(8, { message: "Password must be at least 8 characters" })
    .trim(),
});


export async function login(prevState, formData) {
  const result = loginSchema.safeParse(Object.fromEntries(formData));

  if (!result.success) {
    return {
      errors: result.error.flatten().fieldErrors,
    };
  }

  const { email, password } = result.data;

  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/login/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username_or_email: email,
        password: password,
      }),
    });

    const data = await res.json();

    if (!res.ok || !data.session_token) {
      return {
        errors: {
          email: ["Invalid email or password"],
        },
      };
    }

    // ✅ Create session with user ID
    await createSession(data.user_id);

    // ✅ Redirect to dashboard on success
    redirect("/events");

  } catch (error) {
    return {
      errors: {
        email: ["Something went wrong. Please try again."],
      },
    };
  }
}

// ✅ LOGOUT FUNCTION
export async function logout() {
  await deleteSession();
  redirect("/");
}
