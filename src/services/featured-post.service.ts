import {
  FEATURED_SLOT_COUNT,
  FeaturedSlotsResponse,
  UpdateFeaturedSlotsDto,
} from "@dto/featured-posts.dto";
import { toPostSummaryResponse } from "@dto/post-response.dto";
import { ValidationError, ValidationIssue } from "@errors/http-error";
import { Post } from "@models/post.model";
import postRepository, { PostRepository } from "@repositories/post.repository";

function toSlotsResponse(posts: Post[]): FeaturedSlotsResponse {
  const byPosition = new Map(
    posts.map((post) => [post.featuredPosition, post] as const),
  );

  return {
    slots: Array.from({ length: FEATURED_SLOT_COUNT }, (_, index) => {
      const post = byPosition.get(index + 1);
      return {
        position: index + 1,
        post: post ? toPostSummaryResponse(post) : null,
      };
    }),
  };
}

export class FeaturedPostService {
  constructor(private readonly repository: PostRepository = postRepository) {}

  async getSlots(): Promise<FeaturedSlotsResponse> {
    return toSlotsResponse(await this.repository.findSlottedPosts());
  }

  /**
   * Replaces the whole slot layout. Positions left out (or sent with a null
   * postId) end up empty. Posts that lose their slot are un-featured too, so
   * the editor's "Feature this post" box always matches this page.
   */
  async replaceSlots(dto: UpdateFeaturedSlotsDto): Promise<FeaturedSlotsResponse> {
    const assignments = dto.slots.filter(
      (slot): slot is { position: number; postId: string } =>
        slot.postId !== null,
    );

    await this.repository.transaction(async (transaction) => {
      await this.repository.lockFeaturedSlots(transaction);

      // Checked under the lock, so a post cannot be unpublished between the
      // check and the write.
      const postIds = assignments.map((slot) => slot.postId);
      const publishedIds = await this.repository.findPublishedIds(
        postIds,
        transaction,
      );
      // A post is in the hero or in Featured Insights, never both.
      const heroIds = await this.repository.findHeroIds(postIds, transaction);
      const errors: ValidationIssue[] = dto.slots.flatMap((slot, index) => {
        if (slot.postId === null) {
          return [];
        }
        const field = `slots[${index}].postId`;
        if (!publishedIds.has(slot.postId)) {
          return [{ field, message: "Post does not exist or is not published." }];
        }
        if (heroIds.has(slot.postId)) {
          return [
            {
              field,
              message:
                "This post is in the home page hero, so it cannot also be featured.",
            },
          ];
        }
        return [];
      });
      if (errors.length > 0) {
        throw new ValidationError(errors);
      }

      const keptIds = new Set(assignments.map((slot) => slot.postId));
      const removedIds = (
        await this.repository.findSlottedIds(transaction)
      ).filter((id) => !keptIds.has(id));

      // Clear first: the unique index is checked per statement, so moving a
      // post from slot 2 to slot 1 would otherwise collide mid-rewrite.
      await this.repository.clearAllFeaturedPositions(transaction);
      await this.repository.unfeaturePosts(removedIds, transaction);
      for (const slot of assignments) {
        await this.repository.assignFeaturedPosition(
          slot.postId,
          slot.position,
          transaction,
        );
      }
    });

    return this.getSlots();
  }
}

const featuredPostService = new FeaturedPostService();

export default featuredPostService;
