import { publicApi } from "@/lib/server/api";
import { logProblem } from "@/lib/server/doctor";
import { str, optStr } from "@/lib/server/validate";

// the phone reports a failure it showed (a screen crash, a timeout) to the Problems log; answers with the reference
export const POST = publicApi({ rate: { limit: 30, seconds: 600 } }, async ({ me, body }) => {
  const message = str(body.message, { label: "Problem", required: true, max: 1000 });
  const where = optStr(body.where, { label: "Screen", max: 200 });
  const detail = optStr(body.detail, { label: "Detail", max: 3000 });
  const ref = await logProblem({ error: { message, stack: detail ?? undefined }, route: where ?? "phone", userId: me?.id, isTest: me?.isTest, source: "phone" });
  return { ref };
});
