/** Default topbar copy per role (notifications, profile stub, profile link). */

const defaultNotif = (roleName) => [
  { msg: `Signed in as ${roleName}`, time: "Just now" },
];

export const TOPBAR = {
  guest: {
    notifications: defaultNotif("Guest"),
    profile: {
      name: "Guest",
      email: "guest@abela.local",
      contact: "—",
      roleLabel: "Guest",
    },
    profilePath: "/myprofile",
  },
  admin: {
    notifications: defaultNotif("Administrator"),
    profile: {
      name: "Admin User",
      email: "admin@abela.local",
      contact: "—",
      roleLabel: "Administrator",
    },
    profilePath: "/admin-personal-info",
  },
  cashier: {
    notifications: defaultNotif("Cashier"),
    profile: {
      name: "Cashier",
      email: "cashier@abela.local",
      contact: "—",
      roleLabel: "Cashier",
    },
    profilePath: "/cashier-settings",
  },
  frontdesk: {
    notifications: defaultNotif("Front Desk"),
    profile: {
      name: "Front Desk",
      email: "frontdesk@abela.local",
      contact: "—",
      roleLabel: "Front desk",
    },
    profilePath: "/frontdesk-settings",
  },
  housekeeping: {
    notifications: defaultNotif("Housekeeping"),
    profile: {
      name: "Housekeeping",
      email: "housekeeping@abela.local",
      contact: "—",
      roleLabel: "Housekeeping",
    },
    profilePath: "/housekeeping-settings",
  },
};
