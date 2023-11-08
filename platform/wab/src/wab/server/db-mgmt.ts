import { spawnSync } from "child_process";

export function backupDb() {
  const timestamp = new Date().toISOString().replace(/[-:Z]|\..+/g, "");
  const cmd = `pg_dump -h localhost -U wab -f /tmp/backup-${timestamp}.sql wab`.split(
    " "
  );
  spawnSync(cmd[0], cmd.slice(1), { stdio: "inherit" });
}
