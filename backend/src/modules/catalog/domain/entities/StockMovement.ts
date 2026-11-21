import { randomUUID } from 'node:crypto';

export const STOCK_MOVEMENT_TYPES = ['adjust'] as const;
export type StockMovementType = (typeof STOCK_MOVEMENT_TYPES)[number];

export interface StockMovementProps {
  id: string;
  productId: string;
  type: StockMovementType;
  qty: number;
  reason: string;
  userId: string | null;
  tabId: string | null;
  createdAt: Date;
}

export interface CreateStockMovementInput {
  productId: string;
  qty: number;
  reason: string;
  userId: string | null;
  tabId?: string | null;
  type?: StockMovementType;
}

export class StockMovement {
  private constructor(private readonly props: StockMovementProps) {}

  static create(input: CreateStockMovementInput): StockMovement {
    return new StockMovement({
      id: randomUUID(),
      productId: input.productId,
      type: input.type ?? 'adjust',
      qty: input.qty,
      reason: input.reason.trim(),
      userId: input.userId,
      tabId: input.tabId ?? null,
      createdAt: new Date(),
    });
  }

  static restore(props: StockMovementProps): StockMovement {
    return new StockMovement({ ...props });
  }

  get id(): string { return this.props.id; }
  get productId(): string { return this.props.productId; }
  get type(): StockMovementType { return this.props.type; }
  get qty(): number { return this.props.qty; }
  get reason(): string { return this.props.reason; }
  get userId(): string | null { return this.props.userId; }
  get tabId(): string | null { return this.props.tabId; }
  get createdAt(): Date { return this.props.createdAt; }
}
