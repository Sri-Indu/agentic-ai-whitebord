
import { db, WhiteboardData } from "@/db";
import { currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { projectId, elements, files, appState } = await req.json();
  const user = await currentUser();

  if (!user) {
    return NextResponse.json("Unauthorized user", { status: 401 });
  }

  if (projectId) {
    try {
      const result = await db
        .insert(WhiteboardData)
        .values({
          projectId,
          elements,
          appState,
          files,
        })
        .onConflictDoUpdate({
          target: WhiteboardData.projectId,
          set: {
            elements,
            appState,
            files,
            updatedAt: new Date(),
          },
        });

      return NextResponse.json(result);
    } catch (error) {
      console.error(error);
      return NextResponse.json("Internal Server Error!", { status: 500 });
    }
  }

  return NextResponse.json("Project information missing", { status: 400 });
}

