import {
  CalendarDays,
  Gem,
  Globe2,
  Mail,
  MapPin,
  MapPinned,
  Phone,
  ShieldCheck,
} from "lucide-react";
import WorldNetworkCanvas from "./WorldNetworkCanvas.jsx";
import { getLocalePack } from "../locales/index.js";
import "../company-trust-strip.css";


const PROOF_META = [
  { icon: "calendar", value: "1980" },
  { icon: "shield", value: "OEM" },
  { icon: "globe", value: "GLOBAL" },
  { icon: "precision", value: "40+" },
  { icon: "countries", value: "50+" },
];


const WAREHOUSE_IMAGES = [
  "/assets/company/warehouse-01.png",
  "/assets/company/warehouse-02.png",
  "/assets/company/warehouse-03.png",
];


const TRUST_ICONS = {
  calendar: CalendarDays,
  shield: ShieldCheck,
  globe: Globe2,
  precision: Gem,
  countries: MapPinned,
};


const CONTACT_ICONS = {
  location: MapPin,
  phone: Phone,
  mail: Mail,
};


function TrustIcon({ name }) {
  const IconComponent = TRUST_ICONS[name] || Globe2;
  return <IconComponent className="delift-trust-strip__glyph" aria-hidden="true" strokeWidth={1.65} />;
}


function ContactIcon({ name }) {
  const IconComponent = CONTACT_ICONS[name] || MapPin;
  return <IconComponent className="delift-trust-strip__contact-glyph" aria-hidden="true" strokeWidth={1.8} />;
}


export function CompanyTrustStrip({ lang = "zh", className = "" }) {
  const t = getLocalePack(lang).company;
  const classes = ["delift-trust-strip", className].filter(Boolean).join(" ");

  return (
    <section className={classes} aria-label={t.ariaLabel}>
      <header className="delift-trust-strip__section-heading">
        <span aria-hidden="true" />
        <strong>{t.sectionLabel}</strong>
        <small>{t.sectionSecondary}</small>
      </header>

      <div className="delift-trust-strip__proofs">
        {PROOF_META.map((meta, index) => {
          const proof = t.proofs[index];
          return (
            <div className="delift-trust-strip__proof" key={meta.icon}>
              <span className="delift-trust-strip__proof-icon">
                <TrustIcon name={meta.icon} />
              </span>
              <span className="delift-trust-strip__proof-copy">
                <strong>{meta.value}</strong>
                <span>{proof.label}</span>
                <small>{proof.secondary}</small>
              </span>
            </div>
          );
        })}
      </div>

      <figure className="delift-trust-strip__warehouse">
        <div className="delift-trust-strip__warehouse-images">
          {WAREHOUSE_IMAGES.map((src) => (
            <img key={src} src={src} alt={t.warehouseAlt} loading="lazy" />
          ))}
        </div>
        <figcaption>
          <strong>{t.warehouseLabel}</strong>
          <span aria-hidden="true"> / </span>
          <span>{t.warehouseSecondary}</span>
        </figcaption>
      </figure>

      <div className="delift-trust-strip__company-card">
        <header className="delift-trust-strip__company-label">
          <strong>{t.companyLabel}</strong>
          <small>{t.companyLabelSecondary}</small>
        </header>

        <div className="delift-trust-strip__company-grid">
          <div className="delift-trust-strip__company">
            <div className="delift-trust-strip__company-heading">
              <span className="delift-trust-strip__company-mark" aria-hidden="true" />
              <div>
                <h2>{t.companyName}</h2>
                <p>{t.companySecondary}</p>
              </div>
            </div>

            <p className="delift-trust-strip__intro">{t.companyIntro}</p>

            <div className="delift-trust-strip__contact-list">
              <div className="delift-trust-strip__contact delift-trust-strip__address">
                <ContactIcon name="location" />
                <div>
                  <span>{t.addressLabel}</span>
                  <strong>{t.address}</strong>
                  <small>{t.addressSecondary}</small>
                </div>
              </div>
              <a className="delift-trust-strip__contact" href="tel:13809772199">
                <ContactIcon name="phone" />
                <span><small>{t.phoneLabel}</small><strong>13809772199</strong></span>
              </a>
              <a className="delift-trust-strip__contact" href="mailto:fpptc@yahoo.com">
                <ContactIcon name="mail" />
                <span><small>{t.emailLabel}</small><strong>fpptc@yahoo.com</strong></span>
              </a>
            </div>
          </div>

          <div className="delift-trust-strip__network">
            <WorldNetworkCanvas />
            <p>{t.networkLabel}</p>
          </div>
        </div>
      </div>
    </section>
  );
}


export default CompanyTrustStrip;
