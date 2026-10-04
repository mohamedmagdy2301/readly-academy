import { readDiagram } from "@/lib/pages";

/** Inlines an SVG from content/diagrams so it can use the site's CSS variables (light/dark). */
export default function Diagram({ name, children }: { name: string; children?: React.ReactNode }) {
  const svg = readDiagram(name);
  return (
    <figure className="diagram dg">
      <div dangerouslySetInnerHTML={{ __html: svg }} />
      {children && <figcaption>{children}</figcaption>}
    </figure>
  );
}
