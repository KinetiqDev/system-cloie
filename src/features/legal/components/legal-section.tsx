import type { LegalBlock, LegalSection } from "../types";

function LegalBlockView({ block }: { block: LegalBlock }) {
  if (block.type === "paragraph") return <p>{block.text}</p>;
  if (block.type === "bullets") {
    return <ul>{block.items.map((item) => <li key={item}>{item}</li>)}</ul>;
  }
  if (block.type === "ordered") {
    return <ol>{block.items.map((item) => <li key={item}>{item}</li>)}</ol>;
  }
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table>
        <thead>
          <tr>{block.table.headers.map((header) => <th key={header} scope="col">{header}</th>)}</tr>
        </thead>
        <tbody>
          {block.table.rows.map((row) => (
            <tr key={row.join("|")}>{row.map((cell) => <td key={cell}>{cell}</td>)}</tr>
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
