from homeassistant import config_entries
from homeassistant.core import callback

from .core.const import DOMAIN

import voluptuous as vol

ACTIONS = {"cloud": "Add Mi Cloud Account", "token": "Add Gateway using Token"}

class XiaomiHubProxyFlow(config_entries.ConfigFlow, domain = DOMAIN):
  @staticmethod
  @callback
  def async_get_options_flow(config_entry: config_entries.ConfigEntry) -> config_entries.OptionsFlow:
    return OptionsFlowHandler(config_entries)

  async def async_step_user(self, user_input=None):
    return self.async_show_form(
      step_id="user",
      data_schema=vol.Schema(
        {vol.Required("action", default="cloud"): vol.In(ACTIONS)}
      )
    )

class OptionsFlowHandler(config_entries.OptionsFlow):
  def __init__(self, config_entry: config_entries.ConfigEntry):
    self.config_entry = config_entry

  async def async_step_init(self, user_input=None):
    print('xomen')
