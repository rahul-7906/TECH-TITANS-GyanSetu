/**
 * GyanSetu — Supabase Configuration Loader
 * 
 * Supports:
 * 1. Dynamic Vercel Serverless environment variables via /api/config
 * 2. Window-level injected variables (window.ENV_SUPABASE_URL)
 * 3. Default fallback for instant out-of-the-box local and preview execution
 */

(function () {
  'use strict';

  var fallbackUrl = 'https://bpfjlpjwspzlcsowespc.supabase.co';
  var fallbackAnon = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJwZmpscGp3c3B6bGNzb3dlc3BjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMzODQzNjEsImV4cCI6MjEwODk2MDM2MX0.FYzEOt01N9fDnitcok_gGVAI6twKGsxbv139itDf5Ms';

  window.SUPABASE_URL = (typeof window.ENV_SUPABASE_URL !== 'undefined' && window.ENV_SUPABASE_URL)
    ? window.ENV_SUPABASE_URL
    : (window.SUPABASE_URL || fallbackUrl);

  window.SUPABASE_ANON = (typeof window.ENV_SUPABASE_ANON !== 'undefined' && window.ENV_SUPABASE_ANON)
    ? window.ENV_SUPABASE_ANON
    : (window.SUPABASE_ANON || fallbackAnon);

  // Set this from the deployment environment after generating VAPID keys.
  window.GYANSETU_VAPID_PUBLIC_KEY = window.ENV_GYANSETU_VAPID_PUBLIC_KEY || '';

  // Initialize global clients if supabase SDK is already loaded
  function initClient() {
    if (typeof window.supabase !== 'undefined' && typeof window.supabase.createClient === 'function') {
      try {
        window.sbClient = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON);
        window.sb = window.sbClient;
      } catch (e) {}
    }
  }

  initClient();

  // Asynchronously refresh credentials from Vercel /api/config if deployed
  var isWebOrigin = window.location.protocol === 'http:' || window.location.protocol === 'https:';
  if (typeof fetch !== 'undefined' && isWebOrigin) {
    fetch('/api/config')
      .then(function (res) { return res.ok ? res.json() : null; })
      .then(function (cfg) {
        if (cfg && cfg.supabaseUrl && cfg.supabaseAnonKey) {
          window.SUPABASE_URL = cfg.supabaseUrl;
          window.SUPABASE_ANON = cfg.supabaseAnonKey;
          initClient();
        }
      })
      .catch(function () {});
  }
})();
