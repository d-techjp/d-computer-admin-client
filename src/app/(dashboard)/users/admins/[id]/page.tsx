import { AdminUserForm } from "../AdminUserForm";

export default async function EditAdminUserPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AdminUserForm userId={id} />;
}
