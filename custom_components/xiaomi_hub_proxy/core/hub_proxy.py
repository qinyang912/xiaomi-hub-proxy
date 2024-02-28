import os
import logging
import asyncio

from aiohttp import ClientSession, ClientTimeout, ClientError, hdrs
from http import HTTPStatus

_LOGGER = logging.getLogger(__name__)

ADDON_HOST = "dd81f657-xiaomi-hub-proxy:3000"

class HubProxyAPIError(RuntimeError):
  """Return if a API throw a error."""

class HubProxy:
  token = None

  def __init__(self, session: ClientSession, servers: list = None) -> None:
    self.session = session
    self.servers = servers

  async def initHubProxy(self, username: str, password: str) -> bool:
    addonHost = os.environ.get("XIAOMI_HUB_PROXY_HOST", ADDON_HOST)
    response = await self.session.post(
      f"http://{addonHost}/init-xiaomi-cloud",
      data={
        "username": username,
        "password": password,
        "servers": self.servers,
      }
    )

    result = await response.json()

    if result["token"]:
      self.token = result["token"]
      return result["token"]

    return False

  async def get_devices(self, gatewayDid: str):
    result = await self.request(f"/devices?gatewayDid={gatewayDid}", method="get")
    return result

  async def get_gateway_list(self):
    result = await self.request('/gateway/list', method="get")
    return result

  async def request(
      self,
      url,
      method="get",
      payload=None,
      timeout=10,
  ):
    addonHost = os.environ.get("XIAOMI_HUB_PROXY_HOST", ADDON_HOST)
    fullUrl = f"http://{addonHost}{url}"
    try:
      response = await self.session.request(
        method,
        fullUrl,
        json=payload,
        headers={
          hdrs.AUTHORIZATION: (
              f"Bearer {self.token}"
          ),
        },
        timeout=ClientTimeout(total=timeout),
      )

      if response.status not in (HTTPStatus.OK, HTTPStatus.BAD_REQUEST):
        _LOGGER.error("%s return code %d", url, response.status)
        raise HubProxyAPIError()

      return await response.json()

    except asyncio.TimeoutError:
      _LOGGER.error("Timeout on %s request", url)

    except ClientError as err:
      _LOGGER.error("Client error on %s request %s", url, err)

    raise HubProxyAPIError()