import { personal } from "../config/personal";
import { Fade } from "./Stationery";
export function FirstYear() {
  return <section className="first-year" aria-labelledby="year-title"><Fade><p className="eyebrow">Notes from your mom and dad</p><h2 id="year-title">Zade’s first year.</h2><ol className="milestones">{personal.milestones.map((m, i) => <li key={m.label}><span className="milestone-number">0{i + 1}</span><p className="milestone-date">{m.date}</p><h3>{m.label}</h3><p>{m.note}</p></li>)}</ol></Fade></section>;
}
