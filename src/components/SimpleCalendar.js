import React from "react";
import { ChevronDown } from "lucide-react";
import { getProPanelClass } from "../ui";

export const SimpleCalendar = ({ logs, onDayClick, month, year, onMonthChange }) => {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const startDay = firstDay === 0 ? 6 : firstDay - 1;
  const monthNames = [
    "Gennaio",
    "Febbraio",
    "Marzo",
    "Aprile",
    "Maggio",
    "Giugno",
    "Luglio",
    "Agosto",
    "Settembre",
    "Ottobre",
    "Novembre",
    "Dicembre",
  ];

  const getInterventionsForDay = (day) =>
    logs.filter((l) => {
      if (!l.dateString) return false;
      const parts = l.dateString.split("/");
      return (
        parseInt(parts[0]) === day &&
        parseInt(parts[1]) === month + 1 &&
        parseInt(parts[2]) === year
      );
    });

  return (
    <div className={`p-5 rounded-3xl relative ${getProPanelClass("blue")}`}>
      <div className="flex justify-between items-center mb-4">
        <button
          onClick={() =>
            onMonthChange(
              month === 0 ? 11 : month - 1,
              month === 0 ? year - 1 : year
            )
          }
          className="p-2 hover:bg-slate-100 rounded-full transition-colors"
        >
          <ChevronDown className="w-5 h-5 rotate-90" />
        </button>
        <h3 className="font-black text-slate-800 uppercase">
          {monthNames[month]} {year}
        </h3>
        <button
          onClick={() =>
            onMonthChange(
              month === 11 ? 0 : month + 1,
              month === 11 ? year + 1 : year
            )
          }
          className="p-2 hover:bg-slate-100 rounded-full transition-colors"
        >
          <ChevronDown className="w-5 h-5 -rotate-90" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-slate-400 mb-2">
        <div>LU</div>
        <div>MA</div>
        <div>ME</div>
        <div>GI</div>
        <div>VE</div>
        <div>SA</div>
        <div>DO</div>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: startDay }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const dailyLogs = getInterventionsForDay(day);
          const count = dailyLogs.length;
          return (
            <div
              key={day}
              onClick={() =>
                count > 0 &&
                onDayClick(dailyLogs, `${day} ${monthNames[month]} ${year}`)
              }
              className={`h-9 flex flex-col items-center justify-center rounded-lg border transition-all cursor-pointer ${
                count > 0
                  ? "bg-blue-50 border-blue-200 hover:bg-blue-100 shadow-sm"
                  : "border-transparent hover:bg-slate-50"
              }`}
            >
              <span
                className={`text-xs ${
                  count > 0 ? "font-black text-blue-600" : "text-slate-400"
                }`}
              >
                {day}
              </span>
              {count > 0 && (
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-0.5"></div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
