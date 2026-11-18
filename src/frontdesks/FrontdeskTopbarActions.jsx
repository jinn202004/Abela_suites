import { forwardRef, useCallback, useRef, useState } from "react";
import StaffTopbarActions from "../topbar/StaffTopbarActions";
import { TopbarChatIcon } from "./frontdeskTopbarIcons";
import FrontdeskChatPanel from "./FrontdeskChatPanel";

/**
 * Front desk topbar: Notifications → Chat → Profile.
 * Wraps `StaffTopbarActions` with guest messaging panel (UI-only demo).
 */
const FrontdeskTopbarActions = forwardRef(function FrontdeskTopbarActions(props, ref) {
  const innerRef = useRef(null);
  const [chatOpen, setChatOpen] = useState(false);

  const closeChat = useCallback(() => setChatOpen(false), []);

  const openChat = useCallback((e) => {
    e.stopPropagation();
    innerRef.current?.closeMenus?.();
    props.onMenusClosedExtra?.();
    setChatOpen(true);
  }, [props.onMenusClosedExtra]);

  const handleMenusClosedExtra = useCallback(() => {
    closeChat();
    props.onMenusClosedExtra?.();
  }, [closeChat, props.onMenusClosedExtra]);

  return (
    <>
      <StaffTopbarActions
        ref={(node) => {
          innerRef.current = node;
          if (typeof ref === "function") ref(node);
          else if (ref) ref.current = node;
        }}
        {...props}
        roleKey="frontdesk"
        onMenusClosedExtra={handleMenusClosedExtra}
        onMiddleSlotClose={closeChat}
        middleSlot={
          <div
            className="icon-btn"
            onClick={openChat}
            title="Guest Messages"
            style={{ position: "relative" }}
          >
            <TopbarChatIcon className="topbar-icon" aria-label="Guest Messages" />
          </div>
        }
      />
      <FrontdeskChatPanel open={chatOpen} onClose={closeChat} />
    </>
  );
});

export default FrontdeskTopbarActions;
