// Vercel Serverless Function: Secure Configuration Provider
// Injects environment variables from Vercel Project Settings into the frontend

export default function handler(req, res) {
  // Allow caching at CDN edge for fast delivery
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
  res.setHeader('Access-Control-Allow-Origin', '*');

  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://bpfjlpjwspzlcsowespc.supabase.co';
  const supabaseAnonKey = process.env.SUPABASE_ANON || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJwZmpscGp3c3B6bGNzb3dlc3BjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMzODQzNjEsImV4cCI6MjEwODk2MDM2MX0.FYzEOt01N9fDnitcok_gGVAI6twKGsxbv139itDf5Ms';

  res.status(200).json({
    supabaseUrl: supabaseUrl,
    supabaseAnonKey: supabaseAnonKey,
    environment: process.env.VERCEL_ENV || 'production'
  });
}
