import { personal } from "../config/personal";
import { PageSection, WatercolorSpot } from "./Stationery";
export function PhotoGallery() {
  return <section id="photos" className="keepsakes-section" aria-labelledby="photos-title"><PageSection>
    <WatercolorSpot kind="cloud" /><div className="section-heading"><div><p className="eyebrow">From the family album</p><h2 id="photos-title">Little things we’ll keep.</h2></div><p>A few photographs.<br />A whole year inside them.</p></div>
    <div className="keepsake-photos">{personal.photos.map((p, i) => <figure className="photo-print" key={p.label}><span className="paper-tape" aria-hidden="true" />{p.src ? <img src={p.src} alt={p.alt} width={683} height={1024} loading="lazy" /> : <div className="photo-placeholder"><span aria-hidden="true">0{i + 1}</span><p>{p.note}</p></div>}<figcaption>{p.label}</figcaption></figure>)}</div>
  </PageSection></section>;
}
