import type { SupabaseClient } from "@supabase/supabase-js";

type DemoOpsUserSeed = {
  id: string;
  roleId: "admin" | "engineer" | "supervisor" | "finance" | "client";
  fullName: string;
  phone: string;
  email: string;
  status: "active" | "inactive" | "pending";
  employeeCode: string;
  title: string;
  department: string;
};

const DEMO_OPS_USERS: DemoOpsUserSeed[] = [
  {
    id: "admin-vishnu",
    roleId: "admin",
    fullName: "Vishnu Prasad",
    phone: "+91 98470 11001",
    email: "admin@telgo.test",
    status: "active",
    employeeCode: "ADM-0001",
    title: "Operations Administrator",
    department: "Operations"
  },
  {
    id: "eng-arjun",
    roleId: "engineer",
    fullName: "Arjun Nair",
    phone: "+91 98470 11003",
    email: "engineer@telgo.test",
    status: "active",
    employeeCode: "ENG-1007",
    title: "Site Engineer",
    department: "Operations"
  },
  {
    id: "eng-vishnu",
    roleId: "engineer",
    fullName: "Vishnu P",
    phone: "+91 91234 56789",
    email: "vishnu.p@company.com",
    status: "active",
    employeeCode: "ENG-1011",
    title: "Junior Engineer",
    department: "Operations"
  },
  {
    id: "eng-rajeev",
    roleId: "supervisor",
    fullName: "Rajeev R",
    phone: "+91 98470 11223",
    email: "supervisor@telgo.test",
    status: "active",
    employeeCode: "SUP-2034",
    title: "Project Supervisor",
    department: "Operations"
  },
  {
    id: "eng-divya",
    roleId: "finance",
    fullName: "Divya S",
    phone: "+91 90375 55667",
    email: "finance@telgo.test",
    status: "active",
    employeeCode: "FIN-3012",
    title: "Finance Controller",
    department: "Finance"
  },
  {
    id: "eng-jithin",
    roleId: "engineer",
    fullName: "Jithin Jose",
    phone: "+91 93456 77890",
    email: "jithin.j@company.com",
    status: "active",
    employeeCode: "ENG-1021",
    title: "Quality Engineer",
    department: "Operations"
  },
  {
    id: "eng-manu",
    roleId: "supervisor",
    fullName: "Manu Mohan",
    phone: "+91 95443 22110",
    email: "manu.m@company.com",
    status: "active",
    employeeCode: "SUP-2040",
    title: "Project Manager",
    department: "Operations"
  },
  {
    id: "client-reliable",
    roleId: "client",
    fullName: "Reliable Infra Pvt. Ltd.",
    phone: "+91 98765 43210",
    email: "client@telgo.test",
    status: "active",
    employeeCode: "CLI-5001",
    title: "Client Desk",
    department: "Client"
  }
];

export async function syncDemoOpsUsersToSupabase(supabase: SupabaseClient) {
  const userRows = DEMO_OPS_USERS.map((user) => ({
    id: user.id,
    role_id: user.roleId,
    full_name: user.fullName,
    phone: user.phone,
    email: user.email,
    status: user.status
  }));

  const { error: userError } = await supabase
    .from("users")
    .upsert(userRows, { onConflict: "id" });

  if (userError) {
    throw userError;
  }

  const profileRows = DEMO_OPS_USERS.map((user) => ({
    user_id: user.id,
    employee_code: user.employeeCode,
    title: user.title,
    department: user.department
  }));

  const { error: profileError } = await supabase
    .from("profiles")
    .upsert(profileRows, { onConflict: "user_id" });

  if (profileError) {
    throw profileError;
  }
}
