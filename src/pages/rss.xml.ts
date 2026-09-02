import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';

/**
 * The feed for the series. Hand-written rather than pulled from a package:
 * it is one channel and N items with no dates to format, and a dependency
 * for thirty lines of XML is a poor trade.
 *
 * Newest chapter first, so a subscriber sees a new one arrive at the top.
 * Chapters carry no publication date, and an item without one is valid, so
 * the feed states its own build time and leaves items undated.
 */
const escape = (s: string) =>
  s.replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

export async function GET(context: APIContext) {
  const site = context.site!;
  const chapters = (await getCollection('chapters'))
    .filter((c) => !c.data.draft)
    .sort((a, b) => b.data.order - a.data.order);

  const items = chapters.map((c) => {
    const url = new URL(`/${c.id}/`, site).href;
    const num = String(c.data.order).padStart(2, '0');
    return `    <item>
      <title>${escape(`Chapter ${num}: ${c.data.title}`)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <description>${escape(c.data.summary)}</description>
      <category>${escape(c.data.readingTime)}</category>
    </item>`;
  }).join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Backend from First Principles</title>
    <link>${site.href}</link>
    <atom:link href="${new URL('/rss.xml', site).href}" rel="self" type="application/rss+xml" />
    <description>A ${chapters.length}-chapter engineering reference on backend systems, from HTTP and routing through databases, caching and Kafka to production deployment and real-time media.</description>
    <language>en</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${items}
  </channel>
</rss>
`;

  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
}
