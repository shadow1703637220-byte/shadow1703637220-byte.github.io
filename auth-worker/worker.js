// GitHub OAuth broker for Decap CMS. Secrets stay in Worker environment variables.
const headers = { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer', 'X-Content-Type-Options': 'nosniff' };
const cookieName = '__Host-aven-cms-state';
const cookie = (value, age) => `${cookieName}=${value}; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=${age}`;
const jsonForScript = value => JSON.stringify(value).replaceAll('<', '\\u003c');

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method !== 'GET') return new Response('Method not allowed', { status: 405, headers });
    if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET || !env.SITE_ORIGIN || !env.GITHUB_REPO) {
      return new Response('GitHub login has not been configured.', { status: 503, headers });
    }
    if (url.pathname === '/auth') {
      const state = crypto.randomUUID() + crypto.randomUUID();
      const github = new URL('https://github.com/login/oauth/authorize');
      github.search = new URLSearchParams({ client_id: env.GITHUB_CLIENT_ID, redirect_uri: `${url.origin}/callback`, scope: 'public_repo', state }).toString();
      return new Response(null, { status: 302, headers: { ...headers, Location: github.href, 'Set-Cookie': cookie(state, 600) } });
    }
    if (url.pathname !== '/callback') return new Response('Aven CMS authentication', { headers });
    const state = request.headers.get('Cookie')?.split(';').map(part => part.trim()).find(part => part.startsWith(`${cookieName}=`))?.slice(cookieName.length + 1);
    if (!state || state !== url.searchParams.get('state') || !url.searchParams.get('code')) {
      return new Response('Login expired or cancelled. Close this window and try again.', { status: 403, headers: { ...headers, 'Set-Cookie': cookie('', 0) } });
    }
    try {
      const response = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: env.GITHUB_CLIENT_ID, client_secret: env.GITHUB_CLIENT_SECRET, code: url.searchParams.get('code'), redirect_uri: `${url.origin}/callback` }),
      });
      const result = await response.json();
      if (!response.ok || !result.access_token) throw new Error('Token exchange failed');
      const repository = await fetch(`https://api.github.com/repos/${env.GITHUB_REPO}`, { headers: {
        Authorization: `Bearer ${result.access_token}`, Accept: 'application/vnd.github+json', 'User-Agent': 'aven-cms-auth',
      } });
      if (!repository.ok || !(await repository.json()).permissions?.push) throw new Error('Repository access required');
      const nonce = crypto.randomUUID();
      const message = `authorization:github:success:${JSON.stringify({ token: result.access_token, provider: 'github' })}`;
      const html = `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>登录完成</title><p>登录完成，正在返回内容后台…</p><script nonce="${nonce}">
        const origin = ${jsonForScript(new URL(env.SITE_ORIGIN).origin)};
        const listener = event => {
          if (event.origin !== origin || event.source !== window.opener) return;
          window.opener.postMessage(${jsonForScript(message)}, origin);
          window.removeEventListener('message', listener);
          window.close();
        };
        window.addEventListener('message', listener);
        if (window.opener) window.opener.postMessage('authorizing:github', origin);
      </script></html>`;
      return new Response(html, { headers: { ...headers, 'Content-Type': 'text/html; charset=utf-8', 'Set-Cookie': cookie('', 0), 'Content-Security-Policy': `default-src 'none'; script-src 'nonce-${nonce}'; frame-ancestors 'none'; base-uri 'none'` } });
    } catch {
      return new Response('Login failed. Use a GitHub account with write access to this website, then retry.', { status: 403, headers: { ...headers, 'Set-Cookie': cookie('', 0) } });
    }
  },
};
