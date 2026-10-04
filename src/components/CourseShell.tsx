import { getManifest } from "@/lib/course";
import CourseSidebar from "./CourseSidebar";

export default function CourseShell({ currentId, currentUnit, children }: { currentId?: string; currentUnit?: string; children: React.ReactNode }) {
  return (
    <div className="view-grid">
      <CourseSidebar manifest={getManifest()} currentId={currentId} currentUnit={currentUnit} />
      <div className="content">{children}</div>
    </div>
  );
}
