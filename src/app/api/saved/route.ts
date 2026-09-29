import { NextResponse } from "next/server";
import { getSavedPainPoints, removePainPoint, savePainPoint } from "@/lib/saved-pain-points";
import { isPainPoint } from "@/lib/pain-points";

export async function GET() {
  const saved = await getSavedPainPoints();
  return NextResponse.json({ saved });
}

export async function POST(request: Request) {
  try {
    const painPoint: unknown = await request.json();

    if (!isPainPoint(painPoint)) {
      return NextResponse.json({ error: "Invalid pain point payload" }, { status: 400 });
    }

    const saved = await savePainPoint(painPoint);
    return NextResponse.json({ saved });
  } catch {
    return NextResponse.json({ error: "Failed to save thread" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: 'Query parameter "id" is required' }, { status: 400 });
  }

  try {
    const saved = await removePainPoint(id);
    return NextResponse.json({ saved });
  } catch {
    return NextResponse.json({ error: "Failed to remove thread" }, { status: 500 });
  }
}
