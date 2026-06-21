import { FindAndCountOptions, Op, Transaction, WhereOptions } from "sequelize";
import { sequelize, Subscriber } from "@models/index";
import {
  SubscriberAttributes,
  SubscriberCreationAttributes,
  SubscriberStatus,
} from "@models/subscriber.model";
import { SubscriberListFilters } from "@dto/subscriber.dto";

export interface PaginatedSubscribers {
  rows: Subscriber[];
  count: number;
}

function buildSearchWhere(search?: string): WhereOptions<SubscriberAttributes> | null {
  const normalized = search?.trim();
  if (!normalized) {
    return null;
  }

  return {
    email: {
      [Op.iLike]: `%${normalized}%`,
    },
  };
}

export class SubscriberRepository {
  async transaction<T>(
    callback: (transaction: Transaction) => Promise<T>,
  ): Promise<T> {
    return sequelize.transaction(callback);
  }

  async create(
    payload: SubscriberCreationAttributes,
    transaction: Transaction,
  ): Promise<Subscriber> {
    return Subscriber.create(payload, { transaction });
  }

  async save(
    subscriber: Subscriber,
    transaction?: Transaction,
  ): Promise<Subscriber> {
    return subscriber.save({ transaction });
  }

  async restore(
    subscriber: Subscriber,
    transaction?: Transaction,
  ): Promise<void> {
    await subscriber.restore({ transaction });
  }

  async findByEmail(
    email: string,
    options: { transaction?: Transaction; includeDeleted?: boolean } = {},
  ): Promise<Subscriber | null> {
    return Subscriber.findOne({
      where: { email },
      transaction: options.transaction,
      paranoid: !options.includeDeleted,
    });
  }

  async findByVerificationToken(token: string): Promise<Subscriber | null> {
    return Subscriber.findOne({
      where: { verificationToken: token },
    });
  }

  async findByUnsubscribeToken(token: string): Promise<Subscriber | null> {
    return Subscriber.findOne({
      where: { unsubscribeToken: token },
    });
  }

  async findActiveBatch(
    limit: number,
    offset: number,
    transaction: Transaction,
  ): Promise<Subscriber[]> {
    return Subscriber.findAll({
      where: { status: SubscriberStatus.ACTIVE },
      order: [["createdAt", "ASC"]],
      limit,
      offset,
      transaction,
    });
  }

  async adminList(filters: SubscriberListFilters): Promise<PaginatedSubscribers> {
    const conditions: WhereOptions<SubscriberAttributes>[] = [];
    const searchWhere = buildSearchWhere(filters.search);

    if (filters.status) {
      conditions.push({ status: filters.status });
    }

    if (searchWhere) {
      conditions.push(searchWhere);
    }

    const where: WhereOptions<SubscriberAttributes> =
      conditions.length > 1 ? { [Op.and]: conditions } : conditions[0] ?? {};

    const options: FindAndCountOptions<SubscriberAttributes> = {
      where,
      offset: (filters.page - 1) * filters.limit,
      limit: filters.limit,
      order: [["createdAt", "DESC"]],
    };

    return Subscriber.findAndCountAll(options);
  }

  async count(status?: SubscriberStatus): Promise<number> {
    return Subscriber.count({
      where: status ? { status } : undefined,
    });
  }
}

const subscriberRepository = new SubscriberRepository();

export default subscriberRepository;
