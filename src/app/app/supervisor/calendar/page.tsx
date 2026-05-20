import { RoleCalendarMobileScreen } from "@/components/mobile-screens";

export default function SupervisorCalendarPage() {
  return (
    <RoleCalendarMobileScreen
      role="supervisor"
      activeHref="/app/supervisor/calendar"
      backHref="/app/supervisor"
      title="Supervisor Calendar"
      subtitle="Team schedule, attendance, and leave tracking"
    />
  );
}
