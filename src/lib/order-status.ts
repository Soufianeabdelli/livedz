export type Status =
  | "DRAFT" | "NEEDS_INFO" | "AWAITING_CUSTOMER" | "CONFIRMED" | "SHIPMENT_PENDING"
  | "SHIPPED" | "OUT_FOR_DELIVERY" | "DELIVERED" | "RETURNED" | "CANCELLED" | "FAILED";

// Allowed moves. Shipping states will be added with the courier step.
const MOVES: Partial<Record<Status, Status[]>> = {
  DRAFT: ["CONFIRMED", "CANCELLED", "NEEDS_INFO"],
  NEEDS_INFO: ["CONFIRMED", "CANCELLED"],
  AWAITING_CUSTOMER: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["CANCELLED"],
};

export const canTransition = (from: Status, to: Status) => (MOVES[from] ?? []).includes(to);

export const allowedFrom = (to: Status): Status[] =>
  (Object.keys(MOVES) as Status[]).filter((f) => canTransition(f, to));