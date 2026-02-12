import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAdminSession } from "@/lib/admin-auth";
import {
  listPromptVersions,
  createPromptVersion,
  activatePromptVersion,
  type PromptName,
} from "@/lib/prompt-registry";

export async function GET(request: Request) {
  const [session, adminSession] = await Promise.all([
    auth(),
    getAdminSession(),
  ]);
  if (!session && !adminSession) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const name = searchParams.get("name") as PromptName | null;

  try {
    const versions = await listPromptVersions(name || undefined);
    return NextResponse.json(versions);
  } catch (error) {
    console.error("Prompt versions error:", error);
    return NextResponse.json(
      { error: "Failed to fetch prompt versions" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const [session, adminSession] = await Promise.all([
    auth(),
    getAdminSession(),
  ]);
  if (!session && !adminSession) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { action, ...data } = body;

    if (action === "activate") {
      const result = await activatePromptVersion(data.id);
      return NextResponse.json(result);
    }

    // Create new version
    const result = await createPromptVersion({
      name: data.name,
      version: data.version,
      systemPrompt: data.systemPrompt,
      userTemplate: data.userTemplate,
      config: data.config,
      description: data.description,
      setActive: data.setActive,
    });
    return NextResponse.json(result);
  } catch (error) {
    console.error("Prompt version create error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed" },
      { status: 500 },
    );
  }
}
