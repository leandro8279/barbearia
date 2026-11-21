export const TAB_TYPES = ['appointment', 'walk_in'] as const;
export type TabType = (typeof TAB_TYPES)[number];

export const TAB_STATUSES = ['open', 'closed', 'canceled'] as const;
export type TabStatus = (typeof TAB_STATUSES)[number];

export const TAB_ITEM_TYPES = ['service', 'product'] as const;
export type TabItemType = (typeof TAB_ITEM_TYPES)[number];
