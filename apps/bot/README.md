# turex-bot

Bot de WhatsApp para Turex usando **Twilio** + **Express + TypeScript**. Aislado del proyecto Supabase: este `bot/` tiene su propio `package.json` y `node_modules`.

## Estructura

```
bot/src/
├── config/env.ts
├── modules/whatsapp/
│   ├── whatsapp.routes.ts
│   ├── whatsapp.controller.ts
│   └── whatsapp.handler.ts        # lógica: input → respuesta
├── app.ts
└── server.ts
```

Cada nueva "skill" del bot va como un módulo nuevo en `src/modules/` o un nuevo handler dentro de `whatsapp/`.

## Setup

1. `cd bot && npm install`
2. `cp .env.example .env` y completar con las credenciales de Twilio (Console → Account → API keys & tokens).
3. `npm run dev` → server en `http://localhost:3001`
4. En otra terminal: `ngrok http 3001` → copiar la URL pública.
5. Twilio Console → Messaging → Try it out → **WhatsApp Sandbox** → en *"When a message comes in"* pegar:
   `https://<tu-ngrok>.ngrok-free.app/whatsapp/webhook` (método **POST**).
6. Activar el sandbox enviando desde tu WhatsApp el código `join <palabra>` al número del sandbox que muestra Twilio.
7. Mandar `hola` → debería responder.

## Probar sin WhatsApp (curl)

```bash
curl -X POST http://localhost:3001/whatsapp/webhook \
  -d "From=whatsapp:+5491100000000" \
  -d "Body=hola"
```

Respuesta esperada (TwiML):

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Response><Message>👋 Hola, soy el bot de Turex. ¿En qué puedo ayudarte?</Message></Response>
```

## TODO

- Validar `X-Twilio-Signature` con `twilio.validateRequest(...)` antes de procesar.
- Router de comandos / sesiones por usuario.
- Integración con Supabase para consultar datos del negocio del usuario.
