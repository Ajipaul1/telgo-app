import { redirect } from "next/navigation";
import { cookies } from "next/headers";

// the app's front door: signed in → the app; otherwise → sign in
export default async function Start() {
  const c = await cookies();
  redirect(c.get("telgo_sid") ? "/app" : "/login");
}
