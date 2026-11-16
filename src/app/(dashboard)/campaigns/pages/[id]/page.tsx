import { StaticPageForm } from "../_components/StaticPageForm";

export default async function EditStaticPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <StaticPageForm pageId={id} />;
}
