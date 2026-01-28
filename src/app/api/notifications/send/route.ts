import { sendPushNotification } from "@/lib/push";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { title, message, url } = body;

    if (!title || !message) {
      return NextResponse.json(
        { error: "Title and message are required" },
        { status: 400 },
      );
    }

    await sendPushNotification(title, message, url || "/");

    return NextResponse.json({ success: true, count: "sent" });
  } catch (error) {
    console.error("Manual push error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
