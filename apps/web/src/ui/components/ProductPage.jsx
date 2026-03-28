import { PRODUCT_COPY } from "../constants/product-guide-copy.js";

export default function ProductPage() {
  return (
    <section className="card">
      <h2>{PRODUCT_COPY.title}</h2>
      <p>{PRODUCT_COPY.description}</p>

      <h3 className="section-title">{PRODUCT_COPY.featuresTitle}</h3>
      <ul className="feature-list">
        {PRODUCT_COPY.features.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>

      <h3 className="section-title">{PRODUCT_COPY.requirementsTitle}</h3>
      <ul className="simple-list">
        {PRODUCT_COPY.requirements.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
}
