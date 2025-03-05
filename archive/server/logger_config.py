import logging
from logging.handlers import TimedRotatingFileHandler

logger = logging.getLogger("DefinerLogger")
logger.setLevel(logging.DEBUG)  # Enable debug by setting to logging.DEBUG

handler = TimedRotatingFileHandler(
    "daily_log.log", when="midnight", interval=1, backupCount=7
)
handler.setFormatter(logging.Formatter("%(asctime)s - %(levelname)s - %(message)s"))
logger.addHandler(handler)
