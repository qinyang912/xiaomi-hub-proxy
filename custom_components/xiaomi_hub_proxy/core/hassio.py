import asyncio
import aiohttp
from http import HTTPStatus
import os
import logging
from yarl import URL

_LOGGER = logging.getLogger(__name__)

class HassioAPIError(RuntimeError):
  """Return if a API trow a error."""

class HassIO:
  def __init__(self, websession: aiohttp.ClientSession) -> None:
    self.websession = websession
    self._ip = os.environ.get("SUPERVISOR")

  async def add_store_repository(self, repository: str):
    repositories = await self.send_command("/store/repositories", method="get")
    target = [
      item
      for item in repositories["data"]
      if item["source"] == repository
    ]
    if len(target) > 0:
      return True

    result = await self.send_command("/store/repositories", payload={"repository": repository})

    if result["result"] == "ok":
      return True

    return False

  async def get_store_addons(self):
    result = await self.send_command("/store/addons", method="get")
    return result

  async def send_command(
    self,
    command,
    method="post",
    payload=None,
    timeout=10,
    return_text=False,
  ):
    url = f"http://{self._ip}{command}"
    if url != str(URL(url)):
      _LOGGER.error("Invalid request %s", command)
      raise HassioAPIError()

    try:
      response = await self.websession.request(
        method,
        url,
        json=payload,
        headers={
          aiohttp.hdrs.AUTHORIZATION: (
              f"Bearer {os.environ.get('SUPERVISOR_TOKEN', '')}"
          ),
        },
        timeout=aiohttp.ClientTimeout(total=timeout),
      )

      if response.status not in (HTTPStatus.OK, HTTPStatus.BAD_REQUEST):
        _LOGGER.error("%s return code %d", command, response.status)
        raise HassioAPIError()

      if return_text:
        return await response.text(encoding="utf-8")

      return await response.json()

    except asyncio.TimeoutError:
      _LOGGER.error("Timeout on %s request", command)

    except aiohttp.ClientError as err:
      _LOGGER.error("Client error on %s request %s", command, err)

    raise HassioAPIError()
