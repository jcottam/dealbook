import { Sandbox } from "@vercel/sandbox";
import { redactUrls } from "@/lib/media/ffmpeg-args";

export const SANDBOX_IMAGE = "vercel/sandbox/ubuntu";
/** The minimal ubuntu image has no /vercel/sandbox, so outputs go to /tmp. */
export const SANDBOX_WORKDIR = "/tmp";

export class FfmpegError extends Error {}

export async function installFfmpeg(sandbox: Sandbox) {
  const result = await sandbox.runCommand({
    cmd: "bash",
    args: ["-c", "apt-get update -qq && DEBIAN_FRONTEND=noninteractive apt-get install -y -qq ffmpeg"],
    sudo: true,
  });
  if (result.exitCode !== 0) {
    throw new Error(`ffmpeg install failed: ${(await result.stderr()).slice(-500)}`);
  }
}

/**
 * Boots a one-off VM that can reach only `allowHosts`.
 * Without FFMPEG_SNAPSHOT_ID, installs ffmpeg first (slow — run `pnpm sandbox:snapshot` once).
 */
export async function createFfmpegSandbox(opts: { allowHosts: string[]; timeoutMs: number }) {
  const base = { timeout: opts.timeoutMs, resources: { vcpus: 2 }, persistent: false };
  const snapshotId = process.env.FFMPEG_SNAPSHOT_ID;

  if (snapshotId) {
    return Sandbox.create({
      ...base,
      source: { type: "snapshot", snapshotId },
      networkPolicy: { allow: opts.allowHosts },
    });
  }

  const sandbox = await Sandbox.create({ ...base, image: SANDBOX_IMAGE });
  try {
    await installFfmpeg(sandbox);
    await sandbox.updateNetworkPolicy({ allow: opts.allowHosts });
  } catch (err) {
    await sandbox.stop();
    throw err;
  }
  return sandbox;
}

export async function runFfmpeg(sandbox: Sandbox, args: string[]) {
  const result = await sandbox.runCommand("ffmpeg", args);
  if (result.exitCode !== 0) {
    const stderr = (await result.stderr()).trim().split("\n").slice(-3).join(" ");
    throw new FfmpegError(redactUrls(stderr) || `ffmpeg exited with code ${result.exitCode}`);
  }
}
