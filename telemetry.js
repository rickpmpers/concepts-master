/**
 * Selfserved AI — First-Party Web Telemetry & Visitor Intelligence Engine
 * Zero external dependencies, ad-blocker immune, privacy-first.
 * 
 * Features:
 *  1. Traffic Origin & Channel Attribution (Search Engines vs. AI Engines vs. LinkedIn vs. Direct)
 *  2. Full UTM Campaign Parsing (utm_source, utm_medium, utm_campaign, utm_content, utm_term)
 *  3. Active Reading vs. Tab-Switch Idle Measurement (Page Visibility API + 30s interaction debounce)
 *  4. Granular Scroll Depth Milestones (25%, 50%, 75%, 90%)
 *  5. Internal Journey & Outbound Exit Click Tracking
 *  6. Reliable unload beaconing via navigator.sendBeacon
 *  7. Optional automated GA4 loader if window.SF_GA_MEASUREMENT_ID is provided
 */
(function() {
  'use strict';

  var ENDPOINT = window.SF_TELEMETRY_ENDPOINT || '/api/telemetry';
  var startTime = Date.now();
  var activeReadSeconds = 0;
  var lastActiveTime = Date.now();
  var isTabActive = !document.hidden;
  var idleThresholdMs = 30000; // 30 seconds inactivity pauses active reading
  var scrollMilestones = { 25: false, 50: false, 75: false, 90: false };
  var maxScrollReached = 0;

  // Session persistence across pageviews within same browser tab/session
  var sessionId = (function() {
    try {
      var sid = sessionStorage.getItem('sf_sid');
      if (!sid) {
        sid = 's_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now().toString(36);
        sessionStorage.setItem('sf_sid', sid);
      }
      return sid;
    } catch (e) {
      return 's_' + Math.random().toString(36).substring(2, 11);
    }
  })();

  // 1. Channel, Referrer, and UTM Parsing
  function parseReferrerAndCampaign() {
    var ref = document.referrer || '';
    var urlParams = new URLSearchParams(window.location.search);

    var utm = {
      source: urlParams.get('utm_source') || '',
      medium: urlParams.get('utm_medium') || '',
      campaign: urlParams.get('utm_campaign') || '',
      content: urlParams.get('utm_content') || '',
      term: urlParams.get('utm_term') || ''
    };

    var channel = 'direct';
    var sourceName = 'direct';

    if (utm.source) {
      sourceName = utm.source.toLowerCase();
      if (sourceName.indexOf('linkedin') !== -1) channel = 'linkedin';
      else if (utm.medium === 'cpc' || utm.medium === 'paid') channel = 'paid';
      else if (utm.medium === 'email' || utm.medium === 'newsletter') channel = 'email';
      else channel = 'campaign';
    } else if (ref) {
      try {
        var refHost = new URL(ref).hostname.toLowerCase();

        // Generative AI Engines
        if (refHost.indexOf('chatgpt.com') !== -1 || ref.indexOf('com.openai.chatgpt') !== -1) {
          channel = 'ai_engine';
          sourceName = 'chatgpt';
        } else if (refHost.indexOf('perplexity.ai') !== -1) {
          channel = 'ai_engine';
          sourceName = 'perplexity';
        } else if (refHost.indexOf('claude.ai') !== -1) {
          channel = 'ai_engine';
          sourceName = 'claude';
        } else if (refHost.indexOf('copilot.microsoft.com') !== -1 || (refHost.indexOf('bing.com') !== -1 && ref.indexOf('/chat') !== -1)) {
          channel = 'ai_engine';
          sourceName = 'copilot';
        } else if (refHost.indexOf('gemini.google.com') !== -1) {
          channel = 'ai_engine';
          sourceName = 'gemini';
        } else if (refHost.indexOf('poe.com') !== -1 || refHost.indexOf('grok.com') !== -1 || refHost.indexOf('x.ai') !== -1) {
          channel = 'ai_engine';
          sourceName = 'other_ai';
        }
        // Traditional Search Engines
        else if (refHost.indexOf('google.') !== -1) {
          channel = 'search_engine';
          sourceName = 'google';
        } else if (refHost.indexOf('bing.com') !== -1) {
          channel = 'search_engine';
          sourceName = 'bing';
        } else if (refHost.indexOf('duckduckgo.com') !== -1) {
          channel = 'search_engine';
          sourceName = 'duckduckgo';
        } else if (refHost.indexOf('brave.com') !== -1) {
          channel = 'search_engine';
          sourceName = 'brave';
        } else if (refHost.indexOf('yahoo.') !== -1 || refHost.indexOf('baidu.') !== -1 || refHost.indexOf('yandex.') !== -1) {
          channel = 'search_engine';
          sourceName = 'other_search';
        }
        // Social / Professional
        else if (refHost.indexOf('linkedin.com') !== -1 || refHost.indexOf('lnkd.in') !== -1) {
          channel = 'linkedin';
          sourceName = 'linkedin';
        } else if (refHost.indexOf('t.co') !== -1 || refHost.indexOf('x.com') !== -1 || refHost.indexOf('twitter.com') !== -1) {
          channel = 'social';
          sourceName = 'x_twitter';
        } else if (refHost.indexOf('reddit.com') !== -1) {
          channel = 'social';
          sourceName = 'reddit';
        }
        // Internal Navigation
        else if (refHost === window.location.hostname || refHost.indexOf('selfserved.ai') !== -1) {
          channel = 'internal';
          sourceName = refHost;
        } else {
          channel = 'referral';
          sourceName = refHost;
        }
      } catch (e) {
        channel = 'referral';
        sourceName = ref;
      }
    }

    return { referrer: ref, channel: channel, source: sourceName, utm: utm };
  }

  var meta = parseReferrerAndCampaign();

  function sendEvent(type, extra) {
    var payload = {
      event_type: type,
      timestamp: new Date().toISOString(),
      session_id: sessionId,
      hostname: window.location.hostname,
      pathname: window.location.pathname,
      title: document.title,
      channel: meta.channel,
      source: meta.source,
      referrer: meta.referrer,
      utm_source: meta.utm.source,
      utm_medium: meta.utm.medium,
      utm_campaign: meta.utm.campaign,
      utm_content: meta.utm.content,
      viewport_w: window.innerWidth,
      viewport_h: window.innerHeight,
      active_read_seconds: Math.round(activeReadSeconds),
      total_dwell_seconds: Math.round((Date.now() - startTime) / 1000),
      max_scroll_reached: maxScrollReached
    };

    if (extra) {
      for (var k in extra) {
        if (extra.hasOwnProperty(k)) payload[k] = extra[k];
      }
    }

    try {
      var blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
      if (navigator.sendBeacon) {
        navigator.sendBeacon(ENDPOINT, blob);
      } else {
        var xhr = new XMLHttpRequest();
        xhr.open('POST', ENDPOINT, true);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.send(JSON.stringify(payload));
      }
    } catch (e) {
      // Fail silently to never impact user experience
    }
  }

  // 2. Initial Pageview Event
  sendEvent('page_view', {});

  // 3. Active Engagement Timer & Idle Tracking
  function recordUserActivity() {
    lastActiveTime = Date.now();
  }

  ['mousemove', 'scroll', 'keydown', 'touchstart', 'click'].forEach(function(evt) {
    window.addEventListener(evt, recordUserActivity, { passive: true });
  });

  setInterval(function() {
    if (isTabActive && (Date.now() - lastActiveTime < idleThresholdMs)) {
      activeReadSeconds += 1;
    }
  }, 1000);

  document.addEventListener('visibilitychange', function() {
    if (document.hidden) {
      isTabActive = false;
      sendEvent('engagement_pause', { reason: 'tab_hidden' });
    } else {
      isTabActive = true;
      lastActiveTime = Date.now();
      sendEvent('engagement_resume', { reason: 'tab_visible' });
    }
  });

  // 4. Scroll Depth Milestones (25%, 50%, 75%, 90%)
  function checkScroll() {
    var docHeight = Math.max(
      document.body.scrollHeight, document.documentElement.scrollHeight,
      document.body.offsetHeight, document.documentElement.offsetHeight,
      document.body.clientHeight, document.documentElement.clientHeight
    );
    var winHeight = window.innerHeight;
    var scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    var scrollPercent = Math.min(100, Math.round(((scrollTop + winHeight) / docHeight) * 100));

    if (scrollPercent > maxScrollReached) {
      maxScrollReached = scrollPercent;
    }

    [25, 50, 75, 90].forEach(function(milestone) {
      if (scrollPercent >= milestone && !scrollMilestones[milestone]) {
        scrollMilestones[milestone] = true;
        sendEvent('scroll_depth', { milestone_percent: milestone });
      }
    });
  }

  var scrollTimer = null;
  window.addEventListener('scroll', function() {
    if (!scrollTimer) {
      scrollTimer = setTimeout(function() {
        checkScroll();
        scrollTimer = null;
      }, 200);
    }
  }, { passive: true });

  // 5. Internal Navigation Journey & Outbound Exit Clicks
  document.addEventListener('click', function(e) {
    var link = e.target.closest('a');
    if (!link || !link.href) return;

    var destination = link.href;
    var linkText = (link.innerText || link.getAttribute('aria-label') || '').trim().substring(0, 80);
    var isExternal = link.hostname && link.hostname !== window.location.hostname;

    sendEvent(isExternal ? 'exit_click' : 'navigation_click', {
      destination_url: destination,
      destination_host: link.hostname,
      link_text: linkText,
      is_external: isExternal
    });
  });

  // 6. Page Unload / Exit Beacon
  window.addEventListener('pagehide', function() {
    sendEvent('page_exit', {
      max_scroll_reached: maxScrollReached
    });
  });

  // 7. Optional Parallel Google Analytics 4 Loader
  if (window.SF_GA_MEASUREMENT_ID && !window.gtag) {
    var gaId = window.SF_GA_MEASUREMENT_ID;
    var gaScript = document.createElement('script');
    gaScript.async = true;
    gaScript.src = 'https://www.googletagmanager.com/gtag/js?id=' + gaId;
    document.head.appendChild(gaScript);

    window.dataLayer = window.dataLayer || [];
    function gtag(){ window.dataLayer.push(arguments); }
    window.gtag = gtag;
    gtag('js', new Date());
    gtag('config', gaId);
  }
})();
