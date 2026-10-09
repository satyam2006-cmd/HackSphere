"""SMTP mailer service for simulated or live outreach email sending."""

from __future__ import annotations

import logging
import os
import smtplib
import uuid
from email.message import EmailMessage
from pathlib import Path
from typing import TypedDict

from dotenv import load_dotenv

# Search for .env or env in project hierarchy
_WORKSPACE_ROOT = Path(__file__).resolve().parent.parent.parent
if (_WORKSPACE_ROOT / ".env").exists():
    load_dotenv(_WORKSPACE_ROOT / ".env")
elif (_WORKSPACE_ROOT / "env").exists():
    load_dotenv(_WORKSPACE_ROOT / "env")
else:
    load_dotenv()

logger = logging.getLogger(__name__)


class OutreachEmailResult(TypedDict):
    status: str
    recipient: str
    message_id: str
    details: str


def get_smtp_config() -> dict[str, object]:
    """Return currently active SMTP configuration."""
    if (_WORKSPACE_ROOT / ".env").exists():
        load_dotenv(_WORKSPACE_ROOT / ".env", override=False)
    elif (_WORKSPACE_ROOT / "env").exists():
        load_dotenv(_WORKSPACE_ROOT / "env", override=False)
    else:
        load_dotenv(override=False)

    host = os.getenv("SMTP_HOST", "").strip()
    port_str = os.getenv("SMTP_PORT", "465").strip()
    try:
        port = int(port_str)
    except ValueError:
        port = 465

    user = os.getenv("SMTP_USER", "").strip() or os.getenv("SMTP_USERNAME", "").strip()
    password = os.getenv("SMTP_PASS", "").strip() or os.getenv("SMTP_PASSWORD", "").strip()
    admin_email = os.getenv("ADMIN_EMAIL", "").strip()
    from_email = (
        os.getenv("SMTP_FROM_EMAIL", "").strip()
        or user
        or admin_email
        or "outreach@hacksphere.local"
    )
    simulate_flag = os.getenv("SMTP_SIMULATE", "").strip().lower() in ("1", "true", "yes")

    is_configured = bool(host and user and password)

    return {
        "host": host,
        "port": port,
        "user": user,
        "password": password,
        "admin_email": admin_email,
        "from_email": from_email,
        "simulate": simulate_flag or not is_configured,
        "is_configured": is_configured,
    }


def send_outreach_email(
    recipient: str,
    subject: str,
    body: str,
    force_simulate: bool | None = None,
) -> OutreachEmailResult:
    """Send an outreach email using configured SMTP or simulated fallback."""
    config = get_smtp_config()
    target_recipient = recipient.strip()
    if not target_recipient:
        raise ValueError("recipient email address must not be blank")

    # Determine simulation vs live delivery:
    # If caller explicitly provided force_simulate boolean, respect it;
    # otherwise fallback to env config.
    should_simulate = (
        True if force_simulate is True
        else False if force_simulate is False
        else (bool(config["simulate"]) or not config["is_configured"])
    )

    if should_simulate or not config["is_configured"]:
        sim_id = f"sim-{uuid.uuid4().hex[:10]}"
        logger.info(
            "Simulated outreach email to %s (subject: %s, message_id: %s)",
            target_recipient,
            subject,
            sim_id,
        )
        return {
            "status": "simulated",
            "recipient": target_recipient,
            "message_id": sim_id,
            "details": f"Simulated outreach delivery to {target_recipient} (no external SMTP call made)",
        }

    # Live SMTP send
    host = str(config["host"])
    port = int(config["port"])
    user = str(config["user"])
    password = str(config["password"])
    from_email = str(config["from_email"])

    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = from_email
    msg["To"] = target_recipient
    msg.set_content(body)

    try:
        if port == 465:
            with smtplib.SMTP_SSL(host, port, timeout=12) as server:
                if user and password:
                    server.login(user, password)
                server.send_message(msg)
        else:
            with smtplib.SMTP(host, port, timeout=12) as server:
                server.starttls()
                if user and password:
                    server.login(user, password)
                server.send_message(msg)

        msg_id = f"smtp-{uuid.uuid4().hex[:10]}"
        logger.info("Successfully sent outreach email to %s via %s:%s", target_recipient, host, port)
        return {
            "status": "sent",
            "recipient": target_recipient,
            "message_id": msg_id,
            "details": f"Sent successfully via SMTP {host}:{port}",
        }
    except Exception as exc:
        logger.error("Failed to send outreach email via SMTP: %s", exc)
        return {
            "status": "error",
            "recipient": target_recipient,
            "message_id": "",
            "details": f"Live SMTP failed ({exc}). Check SMTP credentials in .env or switch to Simulate Mode.",
        }


def send_bulk_outreach_emails(
    items: list[dict[str, str]],
    force_simulate: bool = True,
) -> list[OutreachEmailResult]:
    """Send or simulate bulk outreach emails."""
    results = []
    for item in items:
        recipient = item.get("recipient_email", "").strip() or item.get("email", "").strip()
        subject = item.get("subject", "").strip()
        body = item.get("body", "").strip()
        if not recipient:
            continue
        try:
            res = send_outreach_email(
                recipient=recipient,
                subject=subject,
                body=body,
                force_simulate=force_simulate,
            )
            results.append(res)
        except Exception as exc:
            results.append({
                "status": "error",
                "recipient": recipient,
                "message_id": "",
                "details": f"Error: {exc}",
            })
    return results
