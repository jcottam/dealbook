import { Sandbox } from "@vercel/sandbox";
import { installFfmpeg, SANDBOX_IMAGE } from "@/lib/media/ffmpeg-sandbox";

const t0 = Date.now();
const sandbox = await Sandbox.create({ image: SANDBOX_IMAGE, timeout: 10 * 60_000, persistent: false });
console.log(`sandbox ${sandbox.name} booted in ${Date.now() - t0} ms`);

try {
  const t1 = Date.now();
  await installFfmpeg(sandbox);
  const version = await sandbox.runCommand("ffmpeg", ["-version"]);
  console.log(`ffmpeg installed in ${Date.now() - t1} ms: ${(await version.stdout()).split("\n")[0]}`);

  const snapshot = await sandbox.snapshot({ expiration: 0 });
  console.log(`\nFFMPEG_SNAPSHOT_ID=${snapshot.snapshotId}`);
  console.log("Add this to .env.local and to the Vercel project's environment variables.");
} catch (err) {
  await sandbox.stop();
  throw err;
}
