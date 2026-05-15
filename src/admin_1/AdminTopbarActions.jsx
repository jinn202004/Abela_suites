import { forwardRef } from "react";
import StaffTopbarActions from "../topbar/StaffTopbarActions";

/** Admin shell top bar — same layout/behavior as other staff portals; see `StaffTopbarActions`. */
const AdminTopbarActions = forwardRef(function AdminTopbarActions(props, ref) {
  return <StaffTopbarActions ref={ref} roleKey="admin" {...props} />;
});

export default AdminTopbarActions;
