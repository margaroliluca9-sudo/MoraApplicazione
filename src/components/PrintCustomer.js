// STAMPA DELLA SCHEDA CLIENTE: paese, indirizzo e tutte le gru, con i dati del Drive (paranco, matricola INAIL,
// anno) quando ci sono e gli interventi di ogni gru. Usata dalla scheda cliente e da Esplora.
import { buildCustomerMachinesPdf, pdfFileName } from "../pdf";
import { openPdf } from "./PdfHost";
import { loadRows } from "./DriveCraneInfo";
import { findDriveCrane } from "../driveCranes";
import { getSafeMatricola } from "../utils";

export const printCustomer = ({ customerName, customers = [], machines = [], logs = [] }) => {
  const upper = String(customerName || "").toUpperCase();
  const customer = customers.find((c) => String(c.name || "").toUpperCase() === upper) || null;
  const mine = machines.filter((m) => String(m.customerName || "").toUpperCase() === upper);
  const myLogs = logs.filter((l) => String(l.customer || "").toUpperCase() === upper);
  return openPdf(async () => {
    let rows = [];
    try {
      rows = await loadRows(customerName);
    } catch (e) {
      rows = [];
    }
    return buildCustomerMachinesPdf({
      customerName,
      customer,
      machines: mine.map((m) => ({ ...m, _drive: findDriveCrane(rows, getSafeMatricola(m), customerName) })),
      logs: myLogs,
      today: new Date().toLocaleDateString("it-IT"),
    });
  }, pdfFileName("Scheda cliente", customerName));
};
