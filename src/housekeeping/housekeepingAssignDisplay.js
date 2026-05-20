/** Shared housekeeping assignee labels (admin Room Management + housekeeping portal). */

export function isActiveHousekeepingStaff(member) {
  const role = String(member?.role || "").toLowerCase();
  if (!role.includes("housekeeping")) return false;
  const st = String(member?.status || member?.staffStatus || "").toLowerCase();
  return st !== "inactive";
}

export function teamNamesFromMembers(team) {
  return (Array.isArray(team) ? team : [])
    .map((m) => String(m?.name || "").trim())
    .filter(Boolean);
}

export function bookingExpectsHousekeeping(rawStatus) {
  const k = String(rawStatus || "").toLowerCase();
  return ["approved", "confirmed", "occupied", "checked_in", "checked-in", "completed"].includes(k);
}

/** Reservation row: assigned cleaner, or team when cleaning is expected but unclaimed. */
export function resolveHousekeepingAssignLabel(task, teamNames, rawStatus) {
  const assigned = String(task?.assignedTo?.name || "").trim();
  if (assigned) return assigned;
  if (!task) {
    if (bookingExpectsHousekeeping(rawStatus) && teamNames.length) return teamNames.join(", ");
    return "—";
  }
  const st = String(task.status || "").toLowerCase();
  if ((st === "pending" || st === "in_progress") && teamNames.length) {
    return teamNames.join(", ");
  }
  return "—";
}

const TASK_STATUS_RANK = { in_progress: 0, pending: 1, completed: 2 };

export function pickBestTask(matches) {
  if (!matches.length) return null;
  return [...matches].sort(
    (a, b) =>
      (TASK_STATUS_RANK[String(a.status || "").toLowerCase()] ?? 9) -
      (TASK_STATUS_RANK[String(b.status || "").toLowerCase()] ?? 9),
  )[0];
}

export function tasksForRoom(tasks, roomId, roomNumber) {
  const rid = String(roomId || "").trim();
  const rn = String(roomNumber || "").trim().toLowerCase();
  return (Array.isArray(tasks) ? tasks : []).filter((t) => {
    if (String(t?.targetType || "").toLowerCase() !== "room") return false;
    const trid = String(t?.room?.id || "").trim();
    const trn = String(t?.room?.roomNumber ?? t?.booking?.roomNumber ?? "")
      .trim()
      .toLowerCase();
    return (rid && trid === rid) || (rn && trn && trn === rn);
  });
}

export function tasksForVenue(tasks, venueId, eventNum) {
  const vid = String(venueId || "").trim();
  const en = String(eventNum ?? "").trim().toLowerCase();
  return (Array.isArray(tasks) ? tasks : []).filter((t) => {
    if (String(t?.targetType || "").toLowerCase() !== "event") return false;
    const tvid = String(t?.eventVenue?.id || "").trim();
    const ten = String(t?.eventVenue?.eventNum ?? "").trim().toLowerCase();
    return (vid && tvid === vid) || (en && ten && ten === en);
  });
}

/** Room/venue inventory row: name of staff who started, or active HK team when cleaning is open. */
export function resolveAssetHousekeepingLabel(task, teamNames, assetStatus) {
  const assigned = String(task?.assignedTo?.name || "").trim();
  if (assigned) return assigned;
  const st = task ? String(task.status || "").toLowerCase() : "";
  if ((st === "pending" || st === "in_progress") && teamNames.length) {
    return teamNames.join(", ");
  }
  const s = String(assetStatus || "").toLowerCase();
  if (["needs_cleaning", "cleaning_in_progress"].includes(s) && teamNames.length) {
    return teamNames.join(", ");
  }
  return "—";
}
