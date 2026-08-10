import { redirect } from "next/navigation";

export default async function PostcardShareParentsPage(
  props: PageProps<"/postcard-share-parents">,
) {
  const params = await props.searchParams;
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string") qs.set(key, value);
    else if (Array.isArray(value)) {
      for (const item of value) qs.append(key, item);
    }
  }
  const query = qs.toString();
  redirect(
    query
      ? `/postcard-share-parents.html?${query}`
      : "/postcard-share-parents.html",
  );
}
