import type { LegalBlock, LegalSection } from "../types";

function LegalBlockView({ block }: { block: LegalBlock }) {
  if (block.type === "paragraph") return <p>{block.text}</p>;
  if (block.type === "bullets") {
    return (
      <ul>
        {block.items.map((item, index) => (
          <li key={index}>{item}</li>
        ))}
      </ul>
    );
  }
  if (block.type === "ordered") {
    return (
      <ol>
        {block.items.map((item, index) => (
          <li key={index}>{item}</li>
        ))}
      </ol>
    );
  }
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table>
        <thead>
          <tr>
            {block.table.headers.map((header, index) => (
              <th key={index} scope="col">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {block.table.rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.map((cell, cellIndex) => (
                <td key={cellIndex}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function LegalSectionView({ section }: { section: LegalSection }) {
  return (
    <section id={section.id} aria-labelledby={`${section.id}-heading`} className="scroll-mt-8">
      <h2 id={`${section.id}-heading`}>{section.title}</h2>
      <div className="legal-prose-blocks">
        {section.blocks.map((block, index) => <LegalBlockView key={`${section.id}-${block.type}-${index}`} block={block} />)}
      </div>
    </section>
  );
}
