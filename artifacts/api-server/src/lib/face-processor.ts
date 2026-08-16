import { db, employeesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { processEmployeePhoto } from "./employee-face.js";

export async function processPendingFaces(limit = 5) {
  try {
    const rows = await db
      .select({ id: employeesTable.id, faceImage: employeesTable.faceImage, faceDescriptor: employeesTable.faceDescriptor, notes: employeesTable.notes })
      .from(employeesTable)
      .limit(1000);

    // Skip rows that already failed face detection, otherwise notes keeps growing every run.
    const pending = (rows || [])
      .filter(r => r.faceImage && !r.faceDescriptor && !(r.notes && r.notes.includes("faceError:")))
      .slice(0, limit);
    if (pending.length === 0) return { processed: 0 };

    let processed = 0;
    for (const row of pending) {
      try {
        if (!row.faceImage) continue;
        const faceData = await processEmployeePhoto(row.faceImage as string);
        const updates: Record<string, any> = {};
        if (faceData.faceDescriptor) updates.faceDescriptor = faceData.faceDescriptor;
        if (faceData.faceImage) updates.faceImage = faceData.faceImage;
        if (faceData.faceError) updates.notes = (updates.notes ?? "") + ` faceError:${faceData.faceError}`;
        if (Object.keys(updates).length > 0) {
          await db.update(employeesTable).set(updates).where(eq(employeesTable.id, row.id));
        }
        processed += 1;
      } catch (err) {
        console.error("[face-processor] error processing employee", row.id, err);
      }
    }

    return { processed };
  } catch (err) {
    console.error("[face-processor] failed to query pending faces", err);
    return { processed: 0 };
  }
}
