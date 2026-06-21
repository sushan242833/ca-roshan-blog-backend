import sequelize from "@config/config";
import { Admin } from "./admin.model";
import { Post } from "./post.model";
import { Category } from "./category.model";
import { Tag } from "./tag.model";
import { Subscriber } from "./subscriber.model";
import { NewsletterLog } from "./newsletter-log.model";
import { PostCategory } from "./post-category.model";
import { PostTag } from "./post-tag.model";
import { Media } from "@modules/media/media.model";

const models = [
  Admin,
  Post,
  Category,
  Tag,
  Subscriber,
  NewsletterLog,
  PostCategory,
  PostTag,
  Media,
];

export function registerModels(instance = sequelize) {
  instance.addModels(models);
}

export {
  sequelize,
  Admin,
  Post,
  Category,
  Tag,
  Subscriber,
  NewsletterLog,
  PostCategory,
  PostTag,
  Media,
};
