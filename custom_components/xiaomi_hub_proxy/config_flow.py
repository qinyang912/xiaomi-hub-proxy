import asyncio
import homeassistant.helpers.config_validation as cv
from homeassistant import config_entries
from homeassistant.core import callback
from homeassistant.data_entry_flow import FlowHandler, FlowResult
from homeassistant.helpers.aiohttp_client import async_create_clientsession

from .core.const import DOMAIN
from .core.hub_proxy import HubProxy
from .core.hassio import HassIO

import voluptuous as vol

ACTIONS = {"cloud": "Add Mi Cloud Account", "token": "Add Gateway using Token"}

SERVERS = {
  "cn": "China",
  "de": "Europe",
  "i2": "India",
  "ru": "Russia",
  "sg": "Singapore",
  "us": "United States",
}

def form(
  flow: FlowHandler,
  step_id: str,
  schema: dict,
  defaults: dict = None,
  template: dict = None,
  error: str = None,
):
  """Suppport:
  - overwrite schema defaults from dict (user_input or entry.options)
  - set base error code (translations > config > error > code)
  - set custom error via placeholders ("template": "{error}")
  """
  if defaults:
    for key in schema:
      if key.schema in defaults:
        key.default = vol.default_factory(defaults[key.schema])

  if template and "error" in template:
    error = {"base": "template"}
  elif error:
    error = {"base": error}

  return flow.async_show_form(
    step_id=step_id,
    data_schema=vol.Schema(schema),
    description_placeholders=template,
    errors=error,
  )

class XiaomiHubProxyFlow(config_entries.ConfigFlow, domain = DOMAIN):
  VERSION = 1

  def __init__(self) -> None:
    self.task_add_repository: asyncio.Task | None = None
    self.task_fetch_addons: asyncio.Task | None = None

  @staticmethod
  @callback
  def async_get_options_flow(config_entry: config_entries.ConfigEntry) -> config_entries.OptionsFlow:
    return OptionsFlowHandler(config_entries)

  async def async_step_user(self, data=None):
    return await self.async_step_add_repository()

  async def async_step_add_repository(self, data=None) -> FlowResult:
    """Add Repository"""
    if not self.task_add_repository:
      self.task_add_repository = self.hass.async_create_task(self._async_add_repository())
      return self.async_show_progress(
        step_id="add_repository",
        progress_action="add_repository",
      )

    await self.task_add_repository

    self.task_add_repository = None

    return self.async_show_progress_done(next_step_id="account")

  async def _async_add_repository(self) -> None:
    session = async_create_clientsession(self.hass)
    hassio = HassIO(session)
    try:
      await hassio.add_store_repository("https://github.com/qinyang912/xiaomi-hub-proxy")
    finally:
      self.hass.async_create_task(
        self.hass.config_entries.flow.async_configure(flow_id=self.flow_id)
      )

  async def async_step_account(self, data=None):
    kwargs = {
      "step_id": "account",
      "schema": {
        vol.Required("username"): str,
        vol.Required("password"): str,
        vol.Required("servers", default=["cn"]): cv.multi_select(SERVERS),
      },
      "defaults": data,
      "template": {"verify": ""},
    }

    if data:
      if data["servers"]:
        session = async_create_clientsession(self.hass)
        hubProxy = HubProxy(session)
        await hubProxy.initHubProxy(data["username"], data["password"])

    return form(self, **kwargs)

class OptionsFlowHandler(config_entries.OptionsFlow):
  def __init__(self, config_entry: config_entries.ConfigEntry):
    self.config_entry = config_entry

  async def async_step_init(self, user_input=None):
    print('xomen')
