---
title: "Herramientas"
description: "Visión general de las tres formas de usar ModularCore Hub: CLI, MCP y Web."
archived: true
pagefind: false
banner:
  content: 'Documentación archivada de la versión 1-0-0. <a href="/">Ver la versión actual</a>.'
---

ModularCore Hub ofrece tres formas de acceder al mismo Registry HTTP — todas hablan con la misma
API, ninguna es más "oficial" que otra:

| Herramienta | Cuándo usarla |
| --- | --- |
| [CLI](/1-0-0/referencia/herramientas/cli/) | Terminal, scripts, CI/CD — instalación directa en tu proyecto con `modularcore add`. |
| [MCP](/1-0-0/referencia/herramientas/mcp/) | Agentes IA (Claude Code, Cursor, Claude Desktop) — el agente busca e instala componentes por ti. |
| [Web](/1-0-0/referencia/herramientas/web/) | Navegar el catálogo visualmente o consumir el Registry HTTP directamente sin CLI ni MCP. |

Las tres son clientes delgados: la lógica (versiones, dependencias entre componentes, variables de
entorno) vive en el Registry HTTP, no en cada cliente.
