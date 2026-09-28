export type Role = "admin" | "supervisor" | "engineer" | "finance" | "client";

export const ROLES: Role[] = ["admin", "supervisor", "engineer", "finance", "client"];
export const FIELD: Role[] = ["supervisor", "engineer"];
export const STAFF: Role[] = ["admin", "supervisor", "engineer", "finance"];
export const MONEY: Role[] = ["admin", "finance"];

export const ROLE_LABEL: Record<Role, string> = {
  admin: "Admin",
  supervisor: "Site supervisor",
  engineer: "Site engineer",
  finance: "Accounts",
  client: "Client",
};

// what a person may ask for on the access form (never admin)
export const REQUESTABLE: Role[] = ["supervisor", "engineer", "finance", "client"];

export const isField = (r: string | null | undefined) => r === "supervisor" || r === "engineer";
export const signsIn = (r: string | null | undefined) => r === "supervisor" || r === "engineer" || r === "finance";
