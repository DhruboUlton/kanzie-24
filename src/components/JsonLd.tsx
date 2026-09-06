// Emits a schema.org document as a <script type="application/ld+json">.
//
// The payload is built from our own database rows, never from user input, and
// JSON.stringify is the only thing that touches it. The `<` escape closes the
// one hole that matters: a product name containing "</script>" would end the
// tag early and put the rest of the JSON into the page as markup.
export default function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}
