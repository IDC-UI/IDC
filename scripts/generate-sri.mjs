// Needs internet. Run once, then paste the printed integrity="..." values into index.html:
//   node scripts/generate-sri.mjs
import { createHash } from "node:crypto";
const urls = [
  "https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js",
  "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.118.0/dist/umd/supabase.js",
];
for (const url of urls) {
  const body = Buffer.from(await (await fetch(url)).arrayBuffer());
  console.log(url + "\n  integrity=\"sha384-" + createHash("sha384").update(body).digest("base64") + "\" crossorigin=\"anonymous\"\n");
}
