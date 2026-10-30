import { PostSummaryResponse } from "@dto/post-response.dto";

// The home page "Featured Insights" section has exactly this many slots. The
// database enforces the same range (migration 033).
export const FEATURED_SLOT_COUNT = 6;

export interface FeaturedSlotInput {
  position: number;
  postId: string | null;
}

export interface UpdateFeaturedSlotsDto {
  slots: FeaturedSlotInput[];
}

export interface FeaturedSlotResponse {
  position: number;
  post: PostSummaryResponse | null;
}

// Always FEATURED_SLOT_COUNT entries in position order, so a client can render
// the grid without filling the gaps itself.
export interface FeaturedSlotsResponse {
  slots: FeaturedSlotResponse[];
}
