import { NextFunction, Request, Response } from "express";
import { ValidationError } from "@errors/http-error";
import { SubscriberStatus } from "@models/subscriber.model";
import newsletterService from "@services/newsletter.service";
import {
  EmptyRequestBody,
  EmptyRequestParams,
  SubscribeRequest,
  VerifySubscriberRequest,
} from "@app-types/http.requests";

const DEFAULT_ADMIN_LIMIT = 20;
const MAX_LIMIT = 100;

type RequestQuery = Request<
  EmptyRequestParams,
  unknown,
  EmptyRequestBody
>["query"];

function getQueryString(value: RequestQuery[string]): string | undefined {
  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value) && typeof value[0] === "string") {
    return value[0];
  }

  return undefined;
}

function getPositiveIntegerQuery(
  req: { query: RequestQuery },
  field: string,
  fallback: number,
  max?: number,
): number {
  const rawValue = getQueryString(req.query[field]);
  if (typeof rawValue === "undefined") {
    return fallback;
  }

  const parsed = Number(rawValue);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new ValidationError([
      { field, message: `${field} must be a positive integer.` },
    ]);
  }

  return typeof max === "number" ? Math.min(parsed, max) : parsed;
}

function getStatusQuery(req: { query: RequestQuery }): SubscriberStatus | undefined {
  const rawValue = getQueryString(req.query.status);
  if (typeof rawValue === "undefined") {
    return undefined;
  }

  if (Object.values(SubscriberStatus).includes(rawValue as SubscriberStatus)) {
    return rawValue as SubscriberStatus;
  }

  throw new ValidationError([
    {
      field: "status",
      message: "status must be PENDING, ACTIVE, or UNSUBSCRIBED.",
    },
  ]);
}

export async function createSubscriber(
  req: Request<EmptyRequestParams, unknown, SubscribeRequest>,
  res: Response,
  next: NextFunction,
) {
  try {
    const subscriber = await newsletterService.subscribe(req.body);
    return res.status(201).json({ success: true, data: subscriber });
  } catch (err) {
    return next(err);
  }
}

export async function verifySubscriber(
  req: Request<VerifySubscriberRequest, unknown, EmptyRequestBody>,
  res: Response,
  next: NextFunction,
) {
  try {
    const subscriber = await newsletterService.verify(req.params.token);
    return res.json({ success: true, data: subscriber });
  } catch (err) {
    return next(err);
  }
}

export async function unsubscribeSubscriber(
  req: Request<VerifySubscriberRequest, unknown, EmptyRequestBody>,
  res: Response,
  next: NextFunction,
) {
  try {
    const subscriber = await newsletterService.unsubscribe(req.params.token);
    return res.json({ success: true, data: subscriber });
  } catch (err) {
    return next(err);
  }
}

export async function adminListSubscribers(
  req: Request<EmptyRequestParams, unknown, EmptyRequestBody>,
  res: Response,
  next: NextFunction,
) {
  try {
    const result = await newsletterService.adminList({
      page: getPositiveIntegerQuery(req, "page", 1),
      limit: getPositiveIntegerQuery(req, "limit", DEFAULT_ADMIN_LIMIT, MAX_LIMIT),
      status: getStatusQuery(req),
      search: getQueryString(req.query.search) ?? getQueryString(req.query.q),
    });
    return res.json({ success: true, data: result });
  } catch (err) {
    return next(err);
  }
}

export async function adminSubscriberStats(
  _req: Request<EmptyRequestParams, unknown, EmptyRequestBody>,
  res: Response,
  next: NextFunction,
) {
  try {
    const stats = await newsletterService.stats();
    return res.json({ success: true, data: stats });
  } catch (err) {
    return next(err);
  }
}

export default {
  createSubscriber,
  verifySubscriber,
  unsubscribeSubscriber,
  adminListSubscribers,
  adminSubscriberStats,
};
