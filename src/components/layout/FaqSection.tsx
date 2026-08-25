import { useState } from 'react';
import type { Faq } from '../../seo/site';

/**
 * Renders the page's FAQ as an accordion.
 *
 * The matching FAQPage JSON-LD is *not* emitted here — `scripts/prerender.mjs` writes
 * it into the static <head> at build time so it is present without executing JS.
 */
export function FaqSection({ faqs }: { faqs: Faq[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  if (faqs.length === 0) return null;

  return (
    <section className="faq" aria-labelledby="faq-heading">
      <h2 id="faq-heading" className="faq__heading">
        Frequently asked questions
      </h2>
      <div className="faq__list">
        {faqs.map((faq, index) => {
          const open = openIndex === index;
          const panelId = `faq-panel-${index}`;
          const triggerId = `faq-trigger-${index}`;
          return (
            <div className={`faq__item${open ? ' faq__item--open' : ''}`} key={faq.question}>
              <h3 className="faq__question-heading">
                <button
                  type="button"
                  id={triggerId}
                  className="faq__trigger"
                  aria-expanded={open}
                  aria-controls={panelId}
                  onClick={() => setOpenIndex(open ? null : index)}
                >
                  <span className="faq__question">{faq.question}</span>
                  <svg
                    className="faq__chevron"
                    width="14"
                    height="14"
                    viewBox="0 0 14 14"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path
                      d="M3 5L7 9L11 5"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </h3>
              <div
                className="faq__panel"
                id={panelId}
                role="region"
                aria-labelledby={triggerId}
                // Not `hidden`: display:none would kill the height transition and drop the
                // answer text from the DOM. `inert` keeps it rendered and crawlable while
                // removing it from the a11y tree and tab order while collapsed.
                inert={!open}
              >
                <p className="faq__answer">{faq.answer}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
