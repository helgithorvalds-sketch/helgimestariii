/** Served on a server-side render failure (500): same words and palette as the root error boundary. */
export function renderErrorPage(): string {
  return `<!doctype html>
<html lang="is">
  <head>
    <meta charset="utf-8" />
    <title>Síðan hlóðst ekki · SVIF</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Jost:wght@300&family=Inter:wght@400;500&display=swap" />
    <style>
      body { font: 15px/1.6 Inter, system-ui, -apple-system, sans-serif; background: #f6f5ec; color: #2a2420; display: grid; place-items: center; min-height: 100vh; margin: 0; padding: 1.5rem; -webkit-font-smoothing: antialiased; }
      .card { max-width: 28rem; width: 100%; text-align: center; padding: 2rem; }
      h1 { font: 300 1.6rem/1.2 Jost, Inter, sans-serif; letter-spacing: 0.08em; text-transform: uppercase; margin: 0 0 0.75rem; }
      p { color: rgba(42, 36, 32, 0.72); margin: 0 0 1.75rem; }
      .actions { display: flex; gap: 0.6rem; justify-content: center; flex-wrap: wrap; }
      a, button { min-height: 44px; padding: 0 1.4rem; border-radius: 999px; font: 500 11.5px/1 Inter, sans-serif; letter-spacing: 0.16em; text-transform: uppercase; cursor: pointer; text-decoration: none; border: 1px solid transparent; display: inline-flex; align-items: center; }
      .primary { background: #b29079; color: #2a2420; }
      .primary:hover { background: #c4a48e; }
      .secondary { background: transparent; color: #2a2420; border-color: rgba(42, 36, 32, 0.28); }
      .secondary:hover { border-color: rgba(42, 36, 32, 0.7); }
      :focus-visible { outline: 2px solid currentColor; outline-offset: 3px; }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>Síðan hlóðst ekki</h1>
      <p>Eitthvað fór úrskeiðis hjá okkur. Prófaðu að endurhlaða eða fara á forsíðuna.</p>
      <div class="actions">
        <button class="primary" onclick="location.reload()">Reyna aftur</button>
        <a class="secondary" href="/">Á forsíðu</a>
      </div>
    </div>
  </body>
</html>`;
}
