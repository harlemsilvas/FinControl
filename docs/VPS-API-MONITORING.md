# Monitoramento da API na VPS

## Contexto

Em 24/09/2026, o PM2 do usuario `fincontrol` estava com a lista de processos
vazia. `pm2 resurrect` restaurou a API a partir de `.pm2/dump.pm2`. O servico
`pm2-fincontrol.service` estava `disabled`, por isso nao havia restauracao
automatica no boot.

## Comportamento

- `pm2-fincontrol.service` restaura os processos salvos no boot.
- `fincontrol-api-monitor.timer` executa o monitor a cada minuto.
- O monitor verifica `/health/live`, `/health/ready` e o health publico HTTPS.
- Se `/live` falhar, tenta uma recuperacao pelo PM2 e verifica novamente.
- Se `/live` funcionar mas `/ready` falhar, alerta sem reiniciar a API.
- Se o health publico falhar com a API local saudavel, alerta sem reiniciar.
- Envia e-mail e Telegram em mudancas de estado; entregas falhas sao repetidas
  apenas no canal que falhou. O estado fica em `.pm2/monitor-api-state.json`.
- O monitor nao altera o banco nem executa rollback de release.

## Preparacao dos avisos

O monitor reaproveita `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`,
`SMTP_PASSWORD` e `SMTP_FROM_EMAIL` de `/opt/fincontrol/shared/.env`.
Confirme que esses valores permitem o envio real de e-mail. Crie o arquivo
privado `/opt/fincontrol/shared/monitor.env` na VPS com:

```text
MONITOR_EMAIL_TO=destinatario@example.com
TELEGRAM_BOT_TOKEN=token_do_bot
TELEGRAM_CHAT_ID=id_do_chat
```

Obtenha o token criando um bot no BotFather. Envie uma mensagem ao bot e
consulte `getUpdates` para identificar o `chat.id` do destinatario. Nunca
publique token, senha SMTP ou `monitor.env` no Git.

Nao e necessario entrar em `/opt/fincontrol/shared` como usuario `harlem`:
o diretorio e restrito. Para criar ou editar o arquivo, use o caminho completo
com `sudoedit /opt/fincontrol/shared/monitor.env`.

Para descobrir o ID sem exibir o token no terminal, envie `/start` ao bot e
execute estas tres linhas, uma por vez, na VPS:

```bash
read -r -s -p 'Token do bot: ' TELEGRAM_BOT_TOKEN; echo; export TELEGRAM_BOT_TOKEN
python3 -c 'import os,json,urllib.request; data=json.load(urllib.request.urlopen("https://api.telegram.org/bot"+os.environ["TELEGRAM_BOT_TOKEN"]+"/getUpdates")); print(*(u["message"]["chat"]["id"] for u in data["result"] if "message" in u), sep="\n")'
unset TELEGRAM_BOT_TOKEN
```

O numero impresso e `TELEGRAM_CHAT_ID`. Se o shell mostrar apenas `>` depois
de uma colagem incompleta, pressione `Ctrl+C` antes de tentar novamente.

```bash
sudo chown root:fincontrol /opt/fincontrol/shared/monitor.env
sudo chmod 640 /opt/fincontrol/shared/monitor.env
```

## Instalacao

O deploy instala o script e as unidades systemd. Apos publicar o release,
habilite os servicos na VPS:

```bash
sudo systemctl enable pm2-fincontrol.service
sudo systemctl enable --now fincontrol-api-monitor.timer
sudo systemctl start fincontrol-api-monitor.service
sudo systemctl status fincontrol-api-monitor.timer --no-pager
sudo journalctl -u fincontrol-api-monitor.service -n 50 --no-pager
curl -fsS http://127.0.0.1:3102/health/ready
```

Atencao: `enable` garante restauracao apos reboot; nao interrompa a API
atual so para iniciar o servico PM2 sob systemd. Em uma janela controlada,
confirme que `pm2-fincontrol.service` ficou ativo apos reiniciar a VPS.

Teste o envio dos dois canais sem simular uma falha real:

```bash
sudo systemd-run --wait --collect --pipe --unit=fincontrol-monitor-alert-test \
  -p User=fincontrol \
  -p EnvironmentFile=/opt/fincontrol/shared/.env \
  -p EnvironmentFile=/opt/fincontrol/shared/monitor.env \
  -p WorkingDirectory=/opt/fincontrol \
  /usr/bin/python3 /opt/fincontrol/bin/monitor-api.py --test-alert
```

O comando retorna falha se algum dos canais nao receber a mensagem. Consulte
o journal do servico temporario e confirme o recebimento no e-mail e Telegram.

## Diagnostico

```bash
sudo systemctl status pm2-fincontrol.service fincontrol-api-monitor.timer --no-pager
sudo journalctl -u fincontrol-api-monitor.service -n 100 --no-pager
sudo -u fincontrol -H env PM2_HOME=/opt/fincontrol/.pm2 pm2 status
sudo -u fincontrol -H env PM2_HOME=/opt/fincontrol/.pm2 pm2 logs fincontrol-api --lines 100 --nostream
```
