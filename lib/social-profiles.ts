import type { SocialProfile } from "@/lib/social-profile-types";
import { dealbookSocialProfile } from "@/workspaces/dealbook/social-profile";

export type { SocialProfile } from "@/lib/social-profile-types";

const profiles: Record<string, SocialProfile> = {
  [dealbookSocialProfile.id]: dealbookSocialProfile,
};

export const defaultProfileId = dealbookSocialProfile.id;

export function getSocialProfile(profileId: string | undefined | null): SocialProfile {
  if (profileId && profiles[profileId]) return profiles[profileId];
  return dealbookSocialProfile;
}
