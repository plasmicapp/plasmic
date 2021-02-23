import { PlasmicLock } from "../utils/config-utils";

export function ensureFileLocks(lock: PlasmicLock) {
  for (const project of lock.projects) {
    // Ensure all `ProjectLock`s have `fileLock` array
    if (!project.fileLocks) {
      project.fileLocks = [];
    }
    // Ensure all `FileLock`s have valid checksums
    project.fileLocks = project.fileLocks.filter(
      (fileLock) =>
        typeof fileLock.checksum === "string" && fileLock.checksum.length === 32
    );
  }
  return lock;
}
