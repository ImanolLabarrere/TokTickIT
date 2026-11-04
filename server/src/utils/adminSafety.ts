export type UserRole = "REQUESTER" | "IT_STAFF" | "ADMINISTRATOR";

export interface AdminState {
  role: UserRole;
  isActive: boolean;
}

// BR-20 / FR-11: true when an edit would stop `current` from being an active
// Administrator (deactivation OR demotion). The route then checks whether
// anyone else is still an active Administrator before allowing it.
export function removesActiveAdmin(current: AdminState, next: AdminState): boolean {
  const wasActiveAdmin = current.role === "ADMINISTRATOR" && current.isActive;
  const staysActiveAdmin = next.role === "ADMINISTRATOR" && next.isActive;
  return wasActiveAdmin && !staysActiveAdmin;
}
