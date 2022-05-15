import {
  json,
  LoaderFunction,
  ActionFunction,
  redirect,
} from "@remix-run/node";
import {
  useLoaderData,
  Form,
  useActionData,
  useTransition,
  useFetcher,
  useNavigate,
} from "@remix-run/react";
import { useRef } from "react";
import { marked } from "marked";

import { Post } from "@prisma/client";
import { getPost, updatePost, deletePost } from "~/models/post.server";
import invariant from "tiny-invariant";

type LoaderData = { post: Post };

export const loader: LoaderFunction = async ({ params }) => {
  invariant(params.slug, `params.slug is required`);

  const post = await getPost(params.slug);
  invariant(post, `Post not found: ${params.slug}`);

  return json<LoaderData>({ post });
};

type ActionData =
  | {
      title: string | null;
      slug: string | null;
      markdown: string | null;
    }
  | undefined;

export const action: ActionFunction = async ({ request }) => {
  // TODO: remove me
  await new Promise((res) => setTimeout(res, 1000));

  const formData = await request.formData();
  const method = formData.get("_method");

  if (method === "put") {
    const title = formData.get("title");
    const slug = formData.get("slug");
    const markdown = formData.get("markdown");

    const errors: ActionData = {
      title: title ? null : "Title is required",
      slug: slug ? null : "Slug is required",
      markdown: markdown ? null : "Markdown is required",
    };

    const hasErrors = Object.values(errors).some(
      (errorMessage) => errorMessage
    );
    if (hasErrors) {
      return json<ActionData>(errors);
    }

    invariant(typeof title === "string", "title must be a string");
    invariant(typeof slug === "string", "slug must be a string");
    invariant(typeof markdown === "string", "markdown must be a string");

    await updatePost({ title, slug, markdown });

    return json("ok");
  }

  if (method === "delete") {
    const slug = formData.get("slug") as string;

    await deletePost(slug);

    return redirect("/posts/admin");
  }

  throw new Error("unknown action");
};

const inputClassName = `w-full rounded border border-gray-500 px-2 py-1 text-lg`;

export default function AdminPostSlug() {
  const { post } = useLoaderData<LoaderData>();
  const errors = useActionData();

  const transition = useTransition();
  const isUpdating = Boolean(transition.submission);

  const deleteFetcher = useFetcher();
  const deleteFormRef = useRef<any>();

  const isSubmitting = Boolean(
    transition.submission || deleteFetcher.submission
  );

  return (
    <main className="mx-auto max-w-4xl">
      <h1 className="my-6 border-b-2 text-center text-3xl">{post.title}</h1>
      <Form method="post">
        <input type="hidden" name="_method" value="put" />
        <p>
          <label>
            Post Title:{" "}
            {errors?.title ? (
              <em className="text-red-600">{errors.title}</em>
            ) : null}
            <input
              type="text"
              name="title"
              className={inputClassName}
              defaultValue={post.title}
              disabled={isSubmitting}
            />
          </label>
        </p>
        <p>
          <label>
            Post Slug:{" "}
            {errors?.slug ? (
              <em className="text-red-600">{errors.slug}</em>
            ) : null}
            <input name="slug" defaultValue={post.slug} hidden />
            <input
              type="text"
              className={inputClassName}
              defaultValue={post.slug}
              disabled
            />
          </label>
        </p>
        <p>
          <label htmlFor="markdown">Markdown:</label>
          {errors?.markdown ? (
            <em className="text-red-600">{errors.markdown}</em>
          ) : null}
          <br />
          <textarea
            id="markdown"
            rows={20}
            name="markdown"
            className={`${inputClassName} font-mono`}
            defaultValue={post.markdown}
            disabled={isSubmitting}
          />
        </p>

        <p className="text-right">
          <button
            type="button"
            className="rounded bg-red-500 ml-2 py-2 px-4 text-white hover:bg-red-600 focus:bg-red-400 disabled:bg-red-300"
            disabled={isSubmitting}
            onClick={(e) => {
              deleteFetcher.submit(deleteFormRef.current!);
            }}
          >
            {deleteFetcher.state === "submitting"
              ? "Deleting..."
              : "Delete Post"}
          </button>
          <button
            type="submit"
            className="rounded bg-blue-500 ml-2 py-2 px-4 text-white hover:bg-blue-600 focus:bg-blue-400 disabled:bg-blue-300"
            disabled={isSubmitting}
          >
            {isUpdating ? "Updating..." : "Update Post"}
          </button>
        </p>
      </Form>

      <deleteFetcher.Form method="post" hidden ref={deleteFormRef}>
        <input type="hidden" name="_method" value="delete" />
        <input name="slug" defaultValue={post.slug} hidden />
      </deleteFetcher.Form>
    </main>
  );
}
