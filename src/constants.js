// Costanti dell'app.

export const DEFAULT_LAYOUT = {
  themeColor: "blue",
  borderRadius: "xl",
  appTitle: "Assistenza Mora",
  dashboardOrder: ["new", "explore", "history", "database", "office", "admin"],
  formOrder: [
    "technician",
    "date",
    "ticketNumber",
    "customer",
    "machine",
    "capacity",
    "description",
    "photos",
    "custom",
  ],
  customFields: [],
  // Admin > Design: carattere, grandezza lettere, angoli, spaziatura, animazione di avvio
  fontFamily: "barlow",
  fontScale: "normal",
  radiusStyle: "normal",
  density: "normal",
  showSplash: true,
  formSettings: {
    showMachineId: true,
    showMachineType: true,
    showCapacity: true,
  },
};
