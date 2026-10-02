import { mkdirSync } from "node:fs";
import path from "node:path";

// next-intl's plugin loads @swc/core, which refuses its default cache in
// %LOCALAPPDATA%\swc when that folder's ACL grants access to another SID.
// Keep the native-binding cache inside the project instead. The path is kept
// short because SWC appends a long hash and Windows caps paths at 260 chars.
if (!process.env.SWC_NATIVE_BINDING_CACHE) {
  const dir = path.join(process.cwd(), "node_modules", ".swc");
  mkdirSync(dir, { recursive: true });
  process.env.SWC_NATIVE_BINDING_CACHE = dir;
}
