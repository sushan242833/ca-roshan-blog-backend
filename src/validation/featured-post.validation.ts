import { NextFunction, Request, Response } from "express";
import { FEATURED_SLOT_COUNT } from "@dto/featured-posts.dto";
import { ValidationError, ValidationIssue } from "@errors/http-error";
import { EmptyRequestParams } from "@app-types/http.requests";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validateSlot(
  slot: unknown,
  index: number,
  errors: ValidationIssue[],
): void {
  const field = `slots[${index}]`;
  if (!isRecord(slot)) {
    errors.push({ field, message: `${field} must be an object.` });
    return;
  }

  const { position, postId } = slot;
  if (
    typeof position !== "number" ||
    !Number.isInteger(position) ||
    position < 1 ||
    position > FEATURED_SLOT_COUNT
  ) {
    errors.push({
      field: `${field}.position`,
      message: `position must be an integer from 1 to ${FEATURED_SLOT_COUNT}.`,
    });
  }

  if (postId !== null && (typeof postId !== "string" || !UUID_REGEX.test(postId))) {
    errors.push({
      field: `${field}.postId`,
      message: "postId must be a valid UUID or null.",
    });
  }
}

// Shape checks only. Whether each post exists and is published is decided by
// FeaturedPostService inside the write transaction.
export function validateUpdateFeaturedSlots(
  req: Request<EmptyRequestParams, unknown, unknown>,
  _res: Response,
  next: NextFunction,
) {
  const body = req.body;
  if (!isRecord(body) || !Array.isArray(body.slots)) {
    return next(
      new ValidationError([
        { field: "slots", message: "slots must be an array." },
      ]),
    );
  }

  const slots: unknown[] = body.slots;
  const errors: ValidationIssue[] = [];

  if (slots.length > FEATURED_SLOT_COUNT) {
    errors.push({
      field: "slots",
      message: `slots must contain at most ${FEATURED_SLOT_COUNT} entries.`,
    });
  }

  slots.forEach((slot, index) => validateSlot(slot, index, errors));

  // Uniqueness is only meaningful once every entry is well-formed.
  if (errors.length === 0) {
    const records = slots as { position: number; postId: string | null }[];
    const positions = records.map((slot) => slot.position);
    if (new Set(positions).size !== positions.length) {
      errors.push({ field: "slots", message: "positions must be unique." });
    }

    const postIds = records
      .map((slot) => slot.postId?.toLowerCase())
      .filter((postId): postId is string => typeof postId === "string");
    if (new Set(postIds).size !== postIds.length) {
      errors.push({
        field: "slots",
        message: "A post can hold only one slot.",
      });
    }
  }

  if (errors.length > 0) {
    return next(new ValidationError(errors));
  }

  return next();
}

export default { validateUpdateFeaturedSlots };
