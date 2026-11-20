const esc = (s: unknown) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
const money = (p: number) => `₹${Number.isInteger(p) ? p : p.toFixed(2)}`;

const shell = (title: string, body: string) => `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<style>
:root{color-scheme:light dark;--bg:#fafaf7;--fg:#1c1b19;--muted:#6b675f;--card:#fff;--line:#e6e2d9;--accent:#c2410c}
@media(prefers-color-scheme:dark){:root{--bg:#161513;--fg:#f1eee8;--muted:#a39e93;--card:#201f1c;--line:#35332e;--accent:#fb923c}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:16px/1.45 system-ui,-apple-system,Segoe UI,sans-serif}
main{max-width:640px;margin:0 auto;padding:20px 16px 48px}
header{padding:12px 0 18px;border-bottom:1px solid var(--line);margin-bottom:8px}
h1{margin:0;font-size:26px}.sub{color:var(--muted);font-size:14px;margin-top:4px}
.table{display:inline-block;margin-top:10px;padding:3px 10px;border-radius:99px;background:var(--accent);color:#fff;font-size:13px;font-weight:600}
h2{font-size:18px;margin:26px 0 10px;color:var(--accent)}
.item{display:flex;justify-content:space-between;gap:14px;background:var(--card);border:1px solid var(--line);border-radius:12px;padding:12px 14px;margin-bottom:8px}
.name{font-weight:600}.desc{color:var(--muted);font-size:14px;margin-top:2px}.price{font-weight:600;white-space:nowrap}
.empty{color:var(--muted);padding:28px 0;text-align:center}
</style></head><body><main>${body}</main></body></html>`;

export function renderMenuPage(info: any, menu: any[]) {
  const cats = menu.length
    ? menu.map((c) => `<h2>${esc(c.name)}</h2>${c.items.map((i: any) =>
        `<div class="item"><div><div class="name">${esc(i.name)}</div>${i.description ? `<div class="desc">${esc(i.description)}</div>` : ''}</div><div class="price">${money(i.price)}</div></div>`).join('')}`).join('')
    : `<p class="empty">The menu hasn't been added yet.</p>`;
  return shell(`${info.restaurant.name} Menu`, `<header><h1>${esc(info.restaurant.name)}</h1>
<div class="sub">${esc(info.branch.name)} · ${esc(info.branch.address)}</div>
<span class="table">Table ${esc(info.table.number)}</span></header>${cats}`);
}

export const renderNotFoundPage = () =>
  shell('QR not valid', `<p class="empty"><strong>This QR code is invalid or has expired.</strong><br>Please ask the staff for help.</p>`);
