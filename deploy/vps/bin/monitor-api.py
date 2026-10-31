#!/usr/bin/env python3
"""Check the local API, recover its PM2 process, and alert on state changes."""

import json
import os
import smtplib
import subprocess
import sys
import time
from email.message import EmailMessage
from pathlib import Path
from urllib.error import URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

ROOT = Path('/opt/fincontrol')
STATE_FILE = ROOT / '.pm2/monitor-api-state.json'
ECOSYSTEM = ROOT / 'shared/ecosystem.config.cjs'
PM2 = '/usr/bin/pm2'
BASE_URL = 'http://127.0.0.1:3102/health'
PUBLIC_URL = 'https://hrmmotos.com.br/fincontrol/health/ready'


def healthy(path):
    try:
        with urlopen(f'{BASE_URL}/{path}', timeout=5) as response:
            return response.status == 200
    except (OSError, URLError):
        return False


def public_healthy():
    try:
        with urlopen(PUBLIC_URL, timeout=5) as response:
            return response.status == 200
    except (OSError, URLError):
        return False


def pm2(*args):
    # The PM2 daemon must not inherit the Telegram token from the monitor.
    environment = {key: value for key, value in os.environ.items() if not key.startswith(('TELEGRAM_', 'MONITOR_'))}
    try:
        return subprocess.run([PM2, *args], capture_output=True, text=True, timeout=20, check=False, env=environment)
    except subprocess.TimeoutExpired:
        print(f'PM2 command timed out: {args[0]}', file=sys.stderr)
        return subprocess.CompletedProcess(args, 1, '', 'timeout')


def recover():
    if pm2('describe', 'fincontrol-api').returncode == 0:
        result = pm2('restart', 'fincontrol-api')
    else:
        result = pm2('start', str(ECOSYSTEM), '--only', 'fincontrol-api')
    if result.returncode != 0:
        print(f'PM2 recovery failed: {result.stderr.strip()}', file=sys.stderr)
        return False
    for _ in range(5):
        time.sleep(2)
        if healthy('ready'):
            return True
    return False


def send_email(subject, body):
    recipient = os.getenv('MONITOR_EMAIL_TO')
    host = os.getenv('SMTP_HOST')
    sender = os.getenv('SMTP_FROM_EMAIL')
    if not (recipient and host and sender):
        raise ValueError('MONITOR_EMAIL_TO, SMTP_HOST and SMTP_FROM_EMAIL are required')
    message = EmailMessage()
    message['From'] = sender
    message['To'] = recipient
    message['Subject'] = subject
    message.set_content(body)
    port = int(os.getenv('SMTP_PORT', '587'))
    secure = os.getenv('SMTP_SECURE', 'false').lower() == 'true'
    connection = smtplib.SMTP_SSL(host, port, timeout=10) if secure else smtplib.SMTP(host, port, timeout=10)
    with connection:
        if not secure:
            connection.starttls()
        if os.getenv('SMTP_USER'):
            connection.login(os.environ['SMTP_USER'], os.environ['SMTP_PASSWORD'])
        connection.send_message(message)


def send_telegram(body):
    token = os.getenv('TELEGRAM_BOT_TOKEN')
    chat_id = os.getenv('TELEGRAM_CHAT_ID')
    if not (token and chat_id):
        raise ValueError('TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID are required')
    request = Request(
        f'https://api.telegram.org/bot{token}/sendMessage',
        data=urlencode({'chat_id': chat_id, 'text': body}).encode(),
        method='POST',
    )
    with urlopen(request, timeout=10) as response:
        if response.status != 200 or not json.load(response).get('ok'):
            raise RuntimeError('Telegram rejected the alert')


def notify(subject, body, channels=None):
    pending = []
    for name in channels or ('email', 'telegram'):
        channel = send_email if name == 'email' else send_telegram
        try:
            if channel is send_email:
                channel(subject, body)
            else:
                channel(body)
        except Exception as error:
            # Telegram errors must never print the bot token embedded in a URL.
            print(f'{channel.__name__} failed: {type(error).__name__}', file=sys.stderr)
            pending.append(name)
    return pending


def main():
    if '--test-alert' in sys.argv:
        return 1 if notify('FinControl: teste do monitor', 'Teste de alerta do monitor da API na VPS.') else 0

    previous = {}
    try:
        previous = json.loads(STATE_FILE.read_text())
    except (FileNotFoundError, ValueError):
        pass

    live = healthy('live')
    ready = live and healthy('ready')
    recovered = False
    if not live:
        print('API is not live; attempting one PM2 recovery')
        recovered = recover()
        live = healthy('live')
        ready = live and healthy('ready')
        recovered = recovered or ready

    public_ready = ready and public_healthy()
    if ready and not public_ready:
        status = 'public-failure'
    elif ready:
        status = 'recovered' if recovered else 'healthy'
    elif live:
        status = 'dependency-failure'
    else:
        status = 'api-failure'

    previous_status = previous.get('status', 'healthy')
    alert = None
    if status == 'recovered':
        alert = ('FinControl: API recuperada automaticamente', 'A API parou de responder e foi recuperada pelo monitor. Verifique os logs do PM2 para identificar a causa.')
    elif status != previous_status and status == 'dependency-failure':
        alert = ('FinControl: API sem prontidao', 'A API esta ativa, mas /health/ready falhou. Verifique PostgreSQL e dependencias. O monitor nao reiniciou a API.')
    elif status != previous_status and status == 'api-failure':
        alert = ('FinControl: API indisponivel', 'A API nao respondeu e a tentativa de recuperacao pelo PM2 falhou. Verifique journalctl e logs do PM2.')
    elif status != previous_status and status == 'public-failure':
        alert = ('FinControl: acesso publico indisponivel', 'A API local esta saudavel, mas o endpoint publico falhou. Verifique Nginx, DNS e TLS.')
    elif status == 'healthy' and previous_status in ('api-failure', 'dependency-failure', 'public-failure'):
        alert = ('FinControl: API normalizada', 'A API voltou a responder em /health/ready.')

    pending_alert = {'subject': alert[0], 'body': alert[1], 'channels': ['email', 'telegram']} if alert else previous.get('pending_alert')
    if pending_alert:
        remaining = notify(pending_alert['subject'], pending_alert['body'], pending_alert['channels'])
        pending_alert['channels'] = remaining
        if not remaining:
            pending_alert = None

    STATE_FILE.write_text(json.dumps({'status': 'healthy' if status == 'recovered' else status, 'pending_alert': pending_alert}) + '\n')
    print(f'API monitor: {status}')
    return 0 if ready and public_ready else 1


if __name__ == '__main__':
    sys.exit(main())
