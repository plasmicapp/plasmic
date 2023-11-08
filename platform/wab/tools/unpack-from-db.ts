/**
 * Simple script to unpack some data fetched by Jetbrains IDE. Work around Save LOB not working.
 */

import * as fs from "fs";

const text = fs.readFileSync(process.stdin.fd, "utf8");
const data = JSON.parse(JSON.parse(text)[0].data);
fs.writeFileSync(process.stdout.fd, JSON.stringify(data, null, 2));
