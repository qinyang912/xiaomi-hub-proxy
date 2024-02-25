from aiohttp import ClientSession, hdrs
import os

class HubProxy:
  def __init__(self, session: ClientSession, servers: list = None) -> None:
    self.session = session
    self.servers = servers

  async def initHubProxy(self, username: str, password: str):
    supervisor = os.environ.get("SUPERVISOR")
    r = await self.session.get(
      f"http://{supervisor}/addons",
      headers={
        hdrs.AUTHORIZATION: (
            f"Bearer {os.environ.get('SUPERVISOR_TOKEN', '')}"
        ),
        "X-Hass-Source": "core.handler",
      }
    )
    addons = await r.json()
    print(addons)
