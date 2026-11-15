"use client";

import { useState } from "react";

// Not imported from @/lib/data: that module pulls the whole dashboard JSON into the client bundle.
const formatNumber = (value: number) => new Intl.NumberFormat("en-US").format(value);
const formatNpr = (value: number) =>
  new Intl.NumberFormat("en-NP", { style: "currency", currency: "NPR", maximumFractionDigits: 0 }).format(value);

const PILOT_DAYS = 90;
const WALKS_PER_GUIDE_PER_DAY = 3; // the marketplace default for a guide's daily tour cap
const SATELLITE_TOWNS = ["Kirtipur", "Bungamati", "Panauti"];

interface PolicyRoiSimulatorProps {
  /** Mean tour fee plus tip per booked walk, taken from the dashboard's guide ledger. */
  revenuePerBookingNpr: number;
  /** Share of valley scans currently recorded in the satellite towns, used as the slider's starting point. */
  baselineDispersionPct: number;
}

function Slider(props: {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  onChange: (value: number) => void;
}) {
  return (
    <div className="rangeRow">
      <label htmlFor={props.id}>{props.label}</label>
      <input
        id={props.id}
        type="range"
        min={props.min}
        max={props.max}
        step={props.step}
        value={props.value}
        onChange={(event) => props.onChange(Number(event.target.value))}
      />
      <span className="mono">{props.display}</span>
    </div>
  );
}

export function PolicyRoiSimulator({ revenuePerBookingNpr, baselineDispersionPct }: PolicyRoiSimulatorProps) {
  const [tourists, setTourists] = useState(2000);
  const [conversionPct, setConversionPct] = useState(4);
  const [dispersionPct, setDispersionPct] = useState(Math.round(baselineDispersionPct));

  const bookingsPerDay = (tourists * conversionPct) / 100;
  const incomePerDay = bookingsPerDay * revenuePerBookingNpr;
  const guidesWorking = bookingsPerDay / WALKS_PER_GUIDE_PER_DAY;
  const dispersedPerDay = (tourists * dispersionPct) / 100;
  const perTown = dispersedPerDay / SATELLITE_TOWNS.length;

  return (
    <div>
      <Slider
        id="roi-tourists"
        label="Daily active tourists"
        value={tourists}
        min={200}
        max={20000}
        step={100}
        display={formatNumber(tourists)}
        onChange={setTourists}
      />
      <Slider
        id="roi-conversion"
        label="Scan-to-guide conversion"
        value={conversionPct}
        min={0}
        max={20}
        step={0.5}
        display={`${conversionPct}%`}
        onChange={setConversionPct}
      />
      <Slider
        id="roi-dispersion"
        label="Satellite ward dispersion"
        value={dispersionPct}
        min={0}
        max={40}
        step={1}
        display={`${dispersionPct}%`}
        onChange={setDispersionPct}
      />

      <table className="dataTable" style={{ marginTop: 12 }}>
        <thead>
          <tr>
            <th>Outcome</th>
            <th>Per day</th>
            <th>{PILOT_DAYS}-day pilot</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Guided walks booked</td>
            <td className="mono">{formatNumber(Math.round(bookingsPerDay))}</td>
            <td className="mono">{formatNumber(Math.round(bookingsPerDay * PILOT_DAYS))}</td>
          </tr>
          <tr>
            <td>Guide income (fees + tips)</td>
            <td className="mono">{formatNpr(incomePerDay)}</td>
            <td className="mono">{formatNpr(incomePerDay * PILOT_DAYS)}</td>
          </tr>
          <tr>
            <td>Guides with a full day of walks</td>
            <td className="mono">{formatNumber(Math.round(guidesWorking))}</td>
            <td className="mono">—</td>
          </tr>
          <tr>
            <td>Visitors reaching satellite wards</td>
            <td className="mono">{formatNumber(Math.round(dispersedPerDay))}</td>
            <td className="mono">{formatNumber(Math.round(dispersedPerDay * PILOT_DAYS))}</td>
          </tr>
          {SATELLITE_TOWNS.map((town) => (
            <tr key={town}>
              <td style={{ paddingLeft: "1.6rem" }}>{town}</td>
              <td className="mono">{formatNumber(Math.round(perTown))}</td>
              <td className="mono">{formatNumber(Math.round(perTown * PILOT_DAYS))}</td>
            </tr>
          ))}
          <tr>
            <td>Visitors remaining in UNESCO squares</td>
            <td className="mono">{formatNumber(Math.round(tourists - dispersedPerDay))}</td>
            <td className="mono">—</td>
          </tr>
        </tbody>
      </table>

      <p className="small muted" style={{ marginTop: 10 }}>
        A planning model, not a forecast. Conversion is bookings per 100 active tourists. Each walk earns{" "}
        {formatNpr(revenuePerBookingNpr)}, the mean in this dashboard&apos;s guide ledger. A guide leads{" "}
        {WALKS_PER_GUIDE_PER_DAY} walks a day, and dispersed visitors split evenly across the three towns. The dispersion
        slider starts at the satellite towns&apos; current share of scans ({baselineDispersionPct.toFixed(1)}%).
      </p>
    </div>
  );
}
