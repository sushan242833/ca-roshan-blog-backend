import { CreatePostDto } from "@dto/create-post.dto";
import { UpdatePostDto } from "@dto/update-post.dto";
import { CreateSubscriberDto } from "@dto/subscriber.dto";
import { ParamsDictionary } from "express-serve-static-core";

export type EmptyRequestParams = Record<string, never>;
export type EmptyRequestBody = Record<string, never>;

export interface IdRequestParams extends ParamsDictionary {
  id: string;
}

export interface SlugRequestParams extends ParamsDictionary {
  slug: string;
}

export type CreatePostRequest = CreatePostDto;
export type UpdatePostRequest = UpdatePostDto;

export interface LoginRequest {
  email: string;
  password: string;
}

export type SubscribeRequest = CreateSubscriberDto;

export interface VerifySubscriberRequest extends ParamsDictionary {
  token: string;
}
