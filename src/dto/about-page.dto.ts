import Admin from "@models/admin.model";

export interface ExpertiseItem {
  title: string;
  description: string;
}

export interface AboutPageResponse {
  name: string;
  title: string | null;
  avatarUrl: string | null;
  location: string | null;
  yearsOfExperience: string | null;
  qualification: string | null;
  bio: string | null;
  bioParagraph2: string | null;
  professionalQuote: string | null;
  expertise: ExpertiseItem[];
  closingMessage: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  ogImageUrl: string | null;
}

function isExpertiseItem(item: unknown): item is ExpertiseItem {
  return (
    typeof item === "object" &&
    item !== null &&
    typeof (item as ExpertiseItem).title === "string" &&
    typeof (item as ExpertiseItem).description === "string"
  );
}

export function parseExpertise(raw: string | null | undefined): ExpertiseItem[] {
  if (!raw) return [];

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isExpertiseItem);
  } catch {
    return [];
  }
}

export function toAboutPageResponse(admin: Admin): AboutPageResponse {
  return {
    name: admin.name,
    title: admin.title ?? null,
    avatarUrl: admin.avatarUrl ?? null,
    location: admin.location ?? null,
    yearsOfExperience: admin.yearsOfExperience ?? null,
    qualification: admin.qualification ?? null,
    bio: admin.bio ?? null,
    bioParagraph2: admin.bioParagraph2 ?? null,
    professionalQuote: admin.professionalQuote ?? null,
    expertise: parseExpertise(admin.expertise),
    closingMessage: admin.closingMessage ?? null,
    seoTitle: admin.seoTitle ?? null,
    seoDescription: admin.seoDescription ?? null,
    ogImageUrl: admin.ogImageUrl ?? null,
  };
}
