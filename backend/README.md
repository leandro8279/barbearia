# API local

Execute `npm run seed && npm run api`; a API local escuta na porta 3001 e o Vite a acessa por `/api`. Valores monetários são centavos. Rotas protegidas usam `Authorization: Bearer <token>`. Configure `JWT_SECRET` em Secrets para produção. Se `JWT_SECRET` estiver ausente, a API deriva a chave JWT de `SESSION_SECRET`; sem ambos, a API falha ao iniciar.

```sh
curl http://localhost:3001/health
curl -X POST http://localhost:3001/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"admin@barbearia.test","password":"Barbearia@123"}'
curl 'http://localhost:3001/availability?serviceIds=2&date=AAAA-MM-DD'
curl 'http://localhost:3001/availability/barbers?serviceIds=2'
curl 'http://localhost:3001/availability/days?serviceIds=2&barberId=1&month=AAAA-MM'
curl 'http://localhost:3001/availability/next?serviceIds=2'
```

Use o token de cliente/visitante e um horário retornado por `/availability` para criar o agendamento; repetir o POST para o mesmo horário retorna `409`.

```sh
curl -X POST http://localhost:3001/slotHolds -H 'Content-Type: application/json' \
  -d '{"barberId":1,"serviceIds":[2],"start":"AAAA-MM-DDT09:00:00-03:00"}'
curl -X POST http://localhost:3001/appointments -H 'Authorization: Bearer <token>' \
  -H 'Content-Type: application/json' -d '{"barberId":1,"serviceIds":[2],"start":"AAAA-MM-DDT09:00:00-03:00","holdKey":"<key>"}'
curl -X POST http://localhost:3001/tabs/<id>/close -H 'Authorization: Bearer <token-admin>' \
  -H 'Content-Type: application/json' \
  -d '{"payments":[{"method":"pix","amountCents":6500}],"tipCents":0}'
```

Lembretes vencidos ficam em `notifications` com status `ready`; envio por WhatsApp/e-mail e entrega de recuperação de senha precisam de um provedor configurado.
