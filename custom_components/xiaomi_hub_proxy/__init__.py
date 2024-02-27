import logging
from typing import Sequence

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.storage import Store
from homeassistant.helpers import (
    aiohttp_client as ac,
    config_validation as cv,
    device_registry as dr,
)

from .core.const import DOMAIN
from .core.hub_proxy import HubProxy

_LOGGER = logging.getLogger(__name__)

async def async_setup(hass: HomeAssistant, config: dict):
  hass.data[DOMAIN] = {}
  return True

async def async_setup_entry(hass: HomeAssistant, config_entry: ConfigEntry):
  data: dict = config_entry.data.copy()

  store = Store(hass, 1, f"{DOMAIN}/{data["username"]}.json")
  devices = await store.async_load()

  if devices:
    _LOGGER.debug(f"Loaded from cache {len(devices)} devices")
    _update_devices(devices)

  session = ac.async_create_clientsession(hass)
  hass.data[DOMAIN]["hubProxy"] = hubProxy = HubProxy(session, data["servers"])

  if "hub_proxy_token" in data:
    hubProxy.token = data["hub_proxy_token"]
    devices = await hubProxy.get_devices()
  else:
    devices = None

  if devices is None:
    _LOGGER.debug(f"Login to HubProxy for {config_entry.title}")
    if await hubProxy.initHubProxy(data["username"], data["password"]):
      data.update({"hub_proxy_token": hubProxy.token})
      hass.config_entries.async_update_entry(config_entry, data=data)

      devices = await hubProxy.get_devices()
      if devices is None:
        _LOGGER.error("Can't load devices from HubProxy")

    else:
      _LOGGER.error("Can't login to HubProxy")

  if devices is not None:
    _LOGGER.debug(f"Loaded from HubProxy {len(devices)} devices")
    _update_devices(devices)
    await store.async_save(devices)
  else:
    _LOGGER.debug("No devices in .storage")
    return False

  if "devices" not in hass.data[DOMAIN]:
    hass.data[DOMAIN]["devices"] = devices
  else:
    hass.data[DOMAIN]["devices"] += devices

  _update_devices(devices)

  return True

def _update_devices(devices: Sequence):
  for device in devices:
    did = device["did"]
