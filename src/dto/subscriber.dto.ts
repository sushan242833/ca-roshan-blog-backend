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
  createdAt: Date;
  updatedAt: Date;
}

export interface PublicSubscriberStatusResponse {
  status: SubscriberStatus;
}

export function toPublicSubscriberStatusResponse(
  subscriber: Subscriber,
): PublicSubscriberStatusResponse {
  return { status: subscriber.status };
}

export interface SubscriberStatsResponse {
  total: number;
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
    createdAt: subscriber.createdAt,
    updatedAt: subscriber.updatedAt,
  };
}
