import { RoleCalendarMobileScreen } from "@/components/mobile-screens";

export default function EngineerCalendarPage() {
  return (
    <RoleCalendarMobileScreen
      role="engineer"
      activeHref="/app/engineer/calendar"
      backHref="/app/engineer"
    />
  );
}
