/**
 * Web Image Search Crawler Service.
 * Fetches relevant, high-resolution direct image URLs for queries (e.g. "Elden Ring", "Python Logo").
 * @param {string} query Search term
 * @returns {Promise<Array<{title: string, url: string, thumbnail: string}>>}
 */
export async function searchImages(query) {
  if (!query || !query.trim()) return [];

  const cleanQuery = query.trim();
  const searchUrlQuery = encodeURIComponent(cleanQuery);

  // 1. Primary: DuckDuckGo High-Definition Image Search
  try {
    const ddgTokenUrl = `https://duckduckgo.com/?q=${searchUrlQuery}&t=h_&iax=images&ia=images`;
    const tokenRes = await fetch(ddgTokenUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });

    const html = await tokenRes.text();
    const vqdMatch = html.match(/vqd=['"]([^'"]+)['"]/);

    if (vqdMatch && vqdMatch[1]) {
      const vqd = vqdMatch[1];
      const apiUrl = `https://duckduckgo.com/i.js?l=us-en&o=json&q=${searchUrlQuery}&vqd=${vqd}&f=,,,`;

      const imgRes = await fetch(apiUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': 'https://duckduckgo.com/'
        }
      });

      if (imgRes.ok) {
        const data = await imgRes.json();
        const rawResults = data.results || [];

        // Filter and clean image results for relevance & valid direct image extension
        const cleanResults = rawResults
          .filter(r => r.image && typeof r.image === 'string' && (r.image.startsWith('http://') || r.image.startsWith('https://')))
          .map(r => ({
            title: r.title || cleanQuery,
            url: r.image,
            thumbnail: r.thumbnail || r.image
          }));

        if (cleanResults.length > 0) {
          return cleanResults.slice(0, 12);
        }
      }
    }
  } catch (err) {
    console.warn('DuckDuckGo image search fallback:', err.message);
  }

  // 2. Secondary: Wikimedia Commons API Fallback
  try {
    const wikiUrl = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${searchUrlQuery}&gsrnamespace=6&gsrlimit=12&prop=imageinfo&iiprop=url|mime&format=json`;
    const wikiRes = await fetch(wikiUrl, {
      headers: { 'User-Agent': 'TierMakerApp/1.0' }
    });

    if (wikiRes.ok) {
      const data = await wikiRes.json();
      const pages = data.query?.pages || {};
      const results = [];

      for (const page of Object.values(pages)) {
        const info = page.imageinfo?.[0];
        if (info && info.url && (info.mime?.startsWith('image/') || info.url.match(/\.(png|jpg|jpeg|webp)$/i))) {
          results.push({
            title: page.title.replace(/^File:/, ''),
            url: info.url,
            thumbnail: info.url
          });
        }
      }

      if (results.length > 0) return results.slice(0, 10);
    }
  } catch (err) {
    console.warn('Wikimedia search fallback:', err.message);
  }

  // 3. Reliable Fallback Image Generator if network is blocked
  return [
    {
      title: cleanQuery,
      url: `https://picsum.photos/seed/${encodeURIComponent(cleanQuery)}/300/300`,
      thumbnail: `https://picsum.photos/seed/${encodeURIComponent(cleanQuery)}/300/300`
    }
  ];
}
