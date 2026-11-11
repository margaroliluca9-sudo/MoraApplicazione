// STAMPA: aggiunge al rapporto i dati presi dal Drive (dati della gru e stato di
// fune o catena dall'ultimo foglio di verifica). Se non ci sono o non si riesce a leggerli, il rapporto esce
// come prima: la stampa non deve mai bloccarsi per questo.
import { loadRows } from "./components/DriveCraneInfo";
import { findDriveCrane } from "./driveCranes";

export const withDriveInfo = async (log) => {
  if (!log) return log;
  try {
    const rows = await loadRows(log.customer);
    return { ...log, _drive: findDriveCrane(rows, log.machineId, log.customer) };
  } catch (e) {
    console.error(e);
    return log;
  }
};
