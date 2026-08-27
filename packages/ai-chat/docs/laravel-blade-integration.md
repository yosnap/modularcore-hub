# Laravel / Blade integration

Copy the Blade mount, route and proxy-controller references. Keep the route in Laravel's `web`
middleware group so the CSRF header from Blade is enforced; retain `auth` and a budget-appropriate
`throttle`. Configure the provider key only in `config/services.php`/server environment.

The proxy passes SSE chunks through with connect/total timeouts and stops cURL on client abort. It
limits model, message count/size, total input and output tokens; upstream failures become a
normalized SSE error event. Add the generated route fragment to `routes/web.php`:

```php
require __DIR__.'/modularcore-ai-chat.php';
```
