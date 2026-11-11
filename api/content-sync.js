// Scheduled content metadata importer.
// Configure SUPABASE_SERVICE_ROLE_KEY, GOOGLE_CSE_API_KEY,
// GOOGLE_CSE_ID, YOUTUBE_API_KEY, and CONTENT_SYNC_SECRET in Vercel.

const TRACK_QUERIES = {
  'btech-cse': ['data structures algorithms', 'operating systems DBMS computer networks', 'Python web development'],
  bjmc: ['journalism media communication public relations', 'digital media media law'],
  management: ['management marketing finance accounting entrepreneurship', 'business analytics operations'],
  jee: ['JEE physics chemistry mathematics concepts'],
  gate: ['GATE CSE algorithms operating systems DBMS networks', 'GATE engineering mathematics']
};

const ALLOWED_DOMAINS = [
  'nptel.ac.in', 'swayam.gov.in', 'ocw.mit.edu', 'developer.mozilla.org',
  'docs.python.org', 'docs.oracle.com', 'postgresql.org', 'kernel.org',
  'youtube.com', 'youtu.be',
  'ncert.nic.in', 'epathshala.nic.in', 'nta.ac.in', 'jeeadv.ac.in',
  'gate2026.iitg.ac.in', 'rbi.org.in', 'sebi.gov.in', 'pib.gov.in'
];

function isAllowedUrl(value) {
  try {
    const host = new URL(value).hostname.toLowerCase();
    return ALLOWED_DOMAINS.some(domain => host === domain || host.endsWith(`.${domain}`));
  } catch {
    return false;
  }
}

function normalizeUrl(value) {
  const url = new URL(value);
  url.hash = '';
  ['utm_source', 'utm_medium', 'utm_campaign', 'gclid'].forEach(key => url.searchParams.delete(key));
  return url.toString().replace(/\/$/, '');
}

function supabaseHeaders() {
  return {
    apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
    Prefer: 'resolution=merge-duplicates,return=minimal'
  };
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Upstream request failed: ${response.status}`);
  return response.json();
}

async function googleResults(query) {
  if (!process.env.GOOGLE_CSE_API_KEY || !process.env.GOOGLE_CSE_ID) return [];
  const url = new URL('https://www.googleapis.com/customsearch/v1');
  url.searchParams.set('key', process.env.GOOGLE_CSE_API_KEY);
  url.searchParams.set('cx', process.env.GOOGLE_CSE_ID);
  url.searchParams.set('q', query);
  url.searchParams.set('num', '10');
  const data = await fetchJson(url);
  return (data.items || []).map(item => ({
    title: item.title,
    description: item.snippet || '',
    source_url: item.link,
    provider: 'Google-indexed source',
    content_type: 'article',
    thumbnail_url: item.pagemap?.cse_image?.[0]?.src || ''
  }));
}

async function youtubeResults(query) {
  if (!process.env.YOUTUBE_API_KEY) return [];
  const url = new URL('https://www.googleapis.com/youtube/v3/search');
  url.searchParams.set('key', process.env.YOUTUBE_API_KEY);
  url.searchParams.set('part', 'snippet');
  url.searchParams.set('type', 'video');
  url.searchParams.set('maxResults', '10');
  url.searchParams.set('q', query);
  const data = await fetchJson(url);
  return (data.items || []).map(item => ({
    title: item.snippet?.title || 'Video resource',
    description: item.snippet?.description || '',
    source_url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
    provider: 'YouTube',
    content_type: 'video',
    thumbnail_url: item.snippet?.thumbnails?.medium?.url || '',
    external_id: item.id.videoId || ''
  }));
}

export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const secret = req.headers.authorization?.replace('Bearer ', '') || req.query.secret;
  const expectedSecret = process.env.CONTENT_SYNC_SECRET || process.env.CRON_SECRET;
  if (!expectedSecret || secret !== expectedSecret) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: 'Supabase server configuration is incomplete' });
  }

  const imported = [];
  const rejected = [];
  try {
    for (const [track, queries] of Object.entries(TRACK_QUERIES)) {
      for (const query of queries) {
        const results = [...await googleResults(`${query} open course`), ...await youtubeResults(query)];
        for (const item of results) {
          if (!isAllowedUrl(item.source_url)) {
            rejected.push(item.source_url);
            continue;
          }
          const normalizedUrl = normalizeUrl(item.source_url);
          const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/content_resources?on_conflict=normalized_url`, {
            method: 'POST',
            headers: supabaseHeaders(),
            body: JSON.stringify({
              ...item,
              normalized_url: normalizedUrl,
              track,
              subject: query,
              topic: query,
              status: 'pending',
              updated_at: new Date().toISOString()
            })
          });
          if (!response.ok) throw new Error(`Supabase content import failed: ${response.status}`);
          imported.push(normalizedUrl);
        }
      }
    }
    return res.status(200).json({ imported: imported.length, rejected: rejected.length, review_required: true });
  } catch (error) {
    return res.status(502).json({ error: error.message || 'Content sync failed', imported: imported.length });
  }
}
