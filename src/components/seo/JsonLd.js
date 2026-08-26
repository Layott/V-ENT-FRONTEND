// Structured data, emitted from a server component so it is in the HTML the
// crawler receives rather than added later by script.
//
// Accepts one object or several and drops anything null, so a caller can write
// `<JsonLd data={[websiteLd(), tournamentLd(t, path), breadcrumbLd(trail)]} />`
// and let the builders return null when a record is missing what its type needs.
// Invalid structured data is penalised; an absent block costs nothing.

const JsonLd = ({ data }) => {
  const blocks = (Array.isArray(data) ? data : [data]).filter(Boolean);
  if (!blocks.length) return null;

  return (
    <>
      {blocks.map((block, i) => (
        <script
          key={i}
          type="application/ld+json"
          // The content is built by us from API fields, never from user markup,
          // and JSON.stringify escapes what it contains. The one thing it does
          // not escape is `</script>` inside a string value, which would close
          // this tag early - so that sequence is neutralised explicitly.
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(block).replace(/</g, '\\u003c'),
          }}
        />
      ))}
    </>
  );
};

export default JsonLd;
