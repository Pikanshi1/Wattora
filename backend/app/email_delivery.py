import os
import smtplib
import ssl
from email.message import EmailMessage


class EmailDeliveryError(RuntimeError):
    pass


def get_smtp_settings() -> tuple[str, int, str, str, str]:
    host = os.getenv("SMTP_HOST", "smtp.gmail.com").strip()
    port_value = os.getenv("SMTP_PORT", "587").strip()
    username = os.getenv("SMTP_USERNAME", "").strip()
    password = os.getenv("SMTP_PASSWORD", "").replace(" ", "")
    sender = os.getenv("EMAIL_FROM", "").strip()

    try:
        port = int(port_value)
    except ValueError as exc:
        raise EmailDeliveryError("SMTP_PORT must be a valid port number.") from exc

    if not host or not username or not password or not sender:
        raise EmailDeliveryError(
            "Email delivery is not configured. Set SMTP_USERNAME, SMTP_PASSWORD, "
            "and EMAIL_FROM in the backend environment."
        )

    return host, port, username, password, sender


def send_email(recipient: str, subject: str, body: str) -> None:
    host, port, username, password, sender = get_smtp_settings()
    message = EmailMessage()
    message["From"] = sender
    message["To"] = recipient
    message["Subject"] = subject
    message.set_content(body)

    try:
        with smtplib.SMTP(host, port, timeout=15) as server:
            server.ehlo()
            server.starttls(context=ssl.create_default_context())
            server.ehlo()
            server.login(username, password)
            server.send_message(message)
    except (OSError, smtplib.SMTPException) as exc:
        raise EmailDeliveryError(
            "Gmail could not send the email. Check the SMTP settings and "
            "Google app password."
        ) from exc
