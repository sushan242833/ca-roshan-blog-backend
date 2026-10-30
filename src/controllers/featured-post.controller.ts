import { NextFunction, Request, Response } from "express";
import featuredPostService from "@services/featured-post.service";
import {
  EmptyRequestBody,
  EmptyRequestParams,
  UpdateFeaturedSlotsRequest,
} from "@app-types/http.requests";
import { auditContext, recordAudit } from "@utils/audit";

export async function getFeaturedSlots(
  _req: Request<EmptyRequestParams, unknown, EmptyRequestBody>,
  res: Response,
  next: NextFunction,
) {
  try {
    const result = await featuredPostService.getSlots();
    return res.json({ success: true, data: result });
  } catch (err) {
    return next(err);
  }
}

export async function replaceFeaturedSlots(
  req: Request<EmptyRequestParams, unknown, UpdateFeaturedSlotsRequest>,
  res: Response,
  next: NextFunction,
) {
  try {
    const result = await featuredPostService.replaceSlots(req.body);

    // Changes what every visitor sees on the home page, so it is recorded
    // alongside publish/delete.
    const { ip, userAgent } = auditContext(req);
    await recordAudit({
      action: "post.featured_slots",
      outcome: "success",
      actorId: req.user?.id ?? null,
      targetType: "post",
      targetId: null,
      ip,
      userAgent,
    });

    return res.json({ success: true, data: result });
  } catch (err) {
    return next(err);
  }
}

export default { getFeaturedSlots, replaceFeaturedSlots };
