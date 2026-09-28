"use client";
// Approved work (client): the approved reports on the projects shared with this login, the work only.
// The server limits the list to shared projects and removes every amount of money.
import { Screen } from "@/components/Screen";
import { Empty, Loaded } from "@/components/ui";
import { useLoad } from "@/lib/client/hooks";
import { fmtDay } from "@/lib/shared/format";
import type { ReportListItem } from "@/app/app/reports/_parts/ReportList";
import { plural, projectLabel, workLine } from "@/app/app/reports/_parts/work";

const LIMIT = 400; // the server sends at most this many

export default function ApprovedWork() {
  const load = useLoad<{ reports: ReportListItem[] }>("/api/reports?status=approved", { every: 60 });
  return (
    <Screen title="Approved work" roles={["client"]} testId="client-progress">
      <Loaded load={load} isEmpty={(d) => !d.reports.length}
        empty={<Empty title="No approved work on your projects yet">Work shows here once the Telgo admin approves the site report.</Empty>}>
        {(d) => (
          <>
            <p className="small muted" data-testid="approved-count">{plural(d.reports.length, "approved report", "approved reports")}</p>
            {d.reports.length >= LIMIT && <div className="notice info" role="status"><span>Showing the newest {LIMIT}.</span></div>}
            <div className="list" data-testid="approved-work">
              {d.reports.map((r) => {
                const work = workLine(r.summary);
                return (
                  <a key={r.id} className="item" href={`/app/reports/view/${r.id}`} data-testid="approved-row">
                    <div className="grow stack tight" style={{ gap: 3 }}>
                      <span className="title">{fmtDay(r.reportDate)}</span>
                      <div className="small strong">{projectLabel(r.projectName, r.projectId)}</div>
                      <div className="sub">{work || "No measured work in this report"}</div>
                    </div>
                  </a>
                );
              })}
            </div>
          </>
        )}
      </Loaded>
    </Screen>
  );
}
