import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// Force dynamic rendering
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const socialMedia = await db.socialMedia.findMany({
      orderBy: { platform: "asc" },
    });

    return NextResponse.json(socialMedia);
  } catch (error) {
    console.error("Sosyal medya hesapları getirme hatası:", error);
    return NextResponse.json(
      { error: "Sosyal medya hesapları getirilemedi" },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }

    const socialMediaList = await request.json();

    // Update each social media account
    for (const social of socialMediaList) {
      await db.socialMedia.update({
        where: { id: social.id },
        data: {
          url: social.url,
          enabled: social.enabled,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Sosyal medya güncelleme hatası:", error);
    return NextResponse.json(
      { error: "Güncelleme başarısız" },
      { status: 500 },
    );
  }
}
