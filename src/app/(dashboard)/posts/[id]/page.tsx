import { notFound } from "next/navigation";

import { posts } from "@/mock/posts";

import { PostForm } from "../PostForm";

export default async function EditPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const post = posts.find((item) => item.id === id);

  if (!post) notFound();

  return <PostForm post={post} />;
}
