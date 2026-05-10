const accessToken = process.env.SUPABASE_ACCESS_TOKEN;
const projectRef = process.env.SUPABASE_PROJECT_REF ?? "qujinbsslmyaltfgsjzb";

if (!accessToken) {
  console.error("SUPABASE_ACCESS_TOKEN is required.");
  process.exit(1);
}

const query = `
select 'access_requests.site' as check_name,
  exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'access_requests' and column_name = 'site'
  ) as ok
union all
select 'expenses.urgency',
  exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'expenses' and column_name = 'urgency'
  )
union all
select 'shift_reports.table',
  exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'shift_reports'
  )
union all
select 'site-photos.bucket',
  exists (select 1 from storage.buckets where id = 'site-photos')
union all
select 'access-documents.bucket',
  exists (select 1 from storage.buckets where id = 'access-documents');
`;

const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json"
  },
  body: JSON.stringify({ query })
});

const result = await response.json();
if (!response.ok) {
  console.error(result);
  process.exit(1);
}

console.table(result);
if (result.some((row) => !row.ok)) process.exitCode = 1;
