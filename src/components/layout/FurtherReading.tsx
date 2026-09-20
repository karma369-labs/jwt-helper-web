import { Link } from 'react-router-dom';
import { articlesForTool } from '../../content/loader';

/**
 * Articles that name this tool in their `relatedTools` frontmatter. This is the link from
 * the money pages into the content pillars; the article's own callout is the link back.
 */
export function FurtherReading({ toolPath }: { toolPath: string }) {
  const items = articlesForTool(toolPath);
  if (items.length === 0) return null;

  return (
    <section className="further" aria-labelledby="further-heading">
      <h2 id="further-heading" className="further__heading">
        Further reading
      </h2>
      <ul className="further__list">
        {items.map((item) => (
          <li key={item.path} className="further__item">
            <Link to={item.path} className="further__link">
              <span className="further__title">{item.title}</span>
              <span className="further__desc">{item.description}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
