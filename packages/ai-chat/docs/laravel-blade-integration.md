# Laravel / Blade integration

Copy the Blade mount, route and proxy-controller references. Keep the route in Laravel's `web`
middleware group so the CSRF header from Blade is enforced; retain `auth` and a budget-appropriate
`throttle`. Configure the provider key only in `config/services.php`/server environment.

After `modularcore init` detects Blade, it writes JavaScript under `resources/js/modularcore`.
Import the generated entry from your normal Vite entry, which your layout must serve with
`@vite('resources/js/app.js')`:

```ts
import './modularcore/ai-chat/entry';
```

The generated entry does not register client-side tools: tool handlers are application-specific.
For function calling, instantiate `Chat` in your own Vite module with an explicit tool registry;
the proxy validates and forwards those tool definitions and results.

The proxy passes SSE chunks through with connect/total timeouts and stops cURL on client abort. It
limits model, message count/size, total input and output tokens; upstream failures become a
normalized SSE error event. Add the generated route fragment to `routes/web.php`:

```php
require __DIR__.'/modularcore-ai-chat.php';
```
