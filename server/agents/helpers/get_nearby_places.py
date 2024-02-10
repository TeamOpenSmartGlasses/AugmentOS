from typing import Optional

import requests
import json
from server.server_config import google_maps_api_key



def get_user_location() -> dict:
    geolocation_url = "https://www.googleapis.com/geolocation/v1/geolocate?key=" + google_maps_api_key
    data = {
        "considerIp": "true",
    }

    try:
        response = requests.post(geolocation_url, data=json.dumps(data))
        response.raise_for_status()
        location = response.json()
        return location.get('location', {})
    except requests.RequestException as e:
        print(f"Error fetching user location: {e}")
        return {}


def get_nearby_places(location: dict, radius: int, type: Optional[str] = None) -> list:
    if not location:
        return []

    nearby_url = (
        "https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=" + 
        str(location['lat']) + "," + 
        str(location['lng']) + 
        "&radius=" + str(radius) + 
        ("&type=" + type if type else '') + 
        "&key=" + google_maps_api_key
    )

    try:
        response = requests.get(nearby_url)
        response.raise_for_status()
        places = response.json()
        return places.get('results', [])
    except requests.RequestException as e:
        print(f"Error fetching nearby places: {e}")
        return []
