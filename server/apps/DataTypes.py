from enum import Enum

class AugmentOsDataTypes(str, Enum):
    OTHER = "OTHER"
    TRANSCRIPT = "TRANSCRIPT"
    CAMERA = "CAMERA"
    BUTTON = "BUTTON"
    LOCATION = "LOCATION"
    DISPLAY_REQUEST = "DISPLAY_REQUEST"

    REFERENCE_CARD = "REFERENCE_CARD"
    TEXT_WALL = "TEXT_WALL"
    TEXT_LINE = "TEXT_LINE"
    ROWS_CARD = "ROWS_CARD"
