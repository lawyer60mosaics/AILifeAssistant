import socket

from zeroconf import ServiceInfo, Zeroconf

from app.core.config import settings


class MdnsPublisher:
    def __init__(self) -> None:
        self.zeroconf: Zeroconf | None = None
        self.info: ServiceInfo | None = None
        self.last_error: str | None = None

    def start(self) -> None:
        if not settings.mdns_enabled:
            return

        ip_address = self._local_ip()
        service_type = "_ai-minutes._tcp.local."
        service_name = f"{settings.mdns_service_name}.{service_type}"
        self.info = ServiceInfo(
            service_type,
            service_name,
            addresses=[socket.inet_aton(ip_address)],
            port=settings.hub_port,
            properties={
                "path": "/ws/client",
                "health": "/health",
                "protocol": "ws",
            },
            server=f"ai-minutes-{socket.gethostname()}.local.",
        )
        self.zeroconf = Zeroconf()
        try:
            self.zeroconf.register_service(self.info, strict=False)
            self.last_error = None
        except Exception as exc:
            self.last_error = str(exc)
            self.zeroconf.close()
            self.zeroconf = None
            self.info = None

    def stop(self) -> None:
        if self.zeroconf and self.info:
            try:
                self.zeroconf.unregister_service(self.info)
            except Exception:
                pass
            self.zeroconf.close()
        self.zeroconf = None
        self.info = None

    def payload(self) -> dict[str, str | int | bool]:
        ip_address = self._local_ip()
        return {
            "name": settings.mdns_service_name,
            "host": ip_address,
            "port": settings.hub_port,
            "wsUrl": f"ws://{ip_address}:{settings.hub_port}/ws/client",
            "healthUrl": f"http://{ip_address}:{settings.hub_port}/health",
            "mdnsEnabled": settings.mdns_enabled and self.zeroconf is not None,
            "mdnsError": self.last_error or "",
            "serviceType": "_ai-minutes._tcp.local.",
        }

    def _local_ip(self) -> str:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as sock:
            try:
                sock.connect(("8.8.8.8", 80))
                return str(sock.getsockname()[0])
            except OSError:
                return "127.0.0.1"
