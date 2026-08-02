import { notFound } from "next/navigation";

import { adminUsers } from "@/mock/admin-users";

import { AdminUserForm } from "../AdminUserForm";

export default async function EditAdminUserPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = adminUsers.find((item) => item.id === id);

  if (!user) notFound();

  return <AdminUserForm user={user} />;
}
