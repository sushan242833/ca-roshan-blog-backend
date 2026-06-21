import { Subscriber, SubscriberStatus } from "@models/subscriber.model";

export interface CreateSubscriberDto {
  email: string;
}

export interface SubscriberListFilters {
  page: number;
  limit: number;
  status?: SubscriberStatus;
  search?: string;
}

export interface SubscriberResponse {
  id: string;
  email: string;
  status: SubscriberStatus;
  verifiedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SubscriberStatsResponse {
  total: number;
  pending: number;
  active: number;
  unsubscribed: number;
}

export function toSubscriberResponse(
  subscriber: Subscriber,
): SubscriberResponse {
  return {
    id: subscriber.id,
    email: subscriber.email,
    status: subscriber.status,
    verifiedAt: subscriber.verifiedAt ?? null,
    createdAt: subscriber.createdAt,
    updatedAt: subscriber.updatedAt,
  };
}
