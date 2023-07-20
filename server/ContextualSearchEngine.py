import requests
import json
import random
from pathlib import Path

#Google NLP imports
from google.cloud import language_v1
from typing import Sequence
from google.cloud import enterpriseknowledgegraph as ekg
from gcp_config import gcp_project_id
from gcp_config import google_maps_api_key


#Google static maps imports
import responses
import random
import googlemaps
from googlemaps.maps import StaticMapMarker
from googlemaps.maps import StaticMapPath
from PIL import Image
from io import BytesIO

#image conversion
import base64

#custom
import word_frequency

class ContextualSearchEngine:
    def __init__(self):
        #remember what we've defined
        self.previous_defs = list()
        self.client = googlemaps.Client(key=google_maps_api_key)
        self.imagePath = "images/cse"

    def get_google_static_map_img(self, place, zoom=3):
        url = "https://maps.googleapis.com/maps/api/staticmap"
        responses.add(responses.GET, url, status=200)

        path = StaticMapPath(
            points=["New York City"],
            weight=5,
            color="red",
        )

        marker_1 = StaticMapMarker(locations=[place], color="red")

        map_response = self.client.static_map(
            size=(400, 400),
            zoom=zoom,
            center=place,
            maptype="hybrid",
            format="jpg",
            scale=1,
            markers=[marker_1]
        )
            
        raw_img = b''.join(map_response)

        return raw_img

    def analyze_entities(self, text_content):
        """
        Analyzing Entities in a String

        Args:
          text_content The text content to analyze
        """

        client = language_v1.LanguageServiceClient()

        # Available types: PLAIN_TEXT, HTML
        type_ = language_v1.Document.Type.PLAIN_TEXT

        # Optional. If not specified, the language is automatically detected.
        # For list of supported languages:
        # https://cloud.google.com/natural-language/docs/languages
        language = "en"
        document = {"content": text_content, "type_": type_, "language": language}

        # Available values: NONE, UTF8, UTF16, UTF32
        encoding_type = language_v1.EncodingType.UTF8

        response = client.analyze_entities(
            request={"document": document, "encoding_type": encoding_type}
        )

        return response.entities

    def lookup_mids(self, ids: Sequence[str], project_id=gcp_project_id):
        location = 'global'      # Values: 'global'
        languages = ['en']                    # Optional: List of ISO 639-1 Codes

        # Create a client
        client = ekg.EnterpriseKnowledgeGraphServiceClient()

        # The full resource name of the location
        # e.g. projects/{project_id}/locations/{location}
        parent = client.common_location_path(project=project_id, location=location)

        # Initialize request argument(s)
        request = ekg.LookupRequest(
            parent=parent,
            ids=ids,
            languages=languages,
        )

        # Make the request
        response = client.lookup(request=request)

        # Extract and print date from response
        res = dict()
        for item in response.item_list_element:
            result = item.get("result")

            #get mid and start entry - assuming we always get a mid
            mid = None
            for identifier in result.get("identifier"):
                if identifier.get('name') == 'googleKgMID':
                    mid = identifier.get('value')
                    break

            if mid is None:
                continue

            res[mid] = dict()
            res[mid]["mid"] = mid

            #get google cloud id
            cloud_id = result.get('@id')

            #get image
            if result.get('image'):
                image_url = result.get('image').get('contentUrl')
                #convert to actual image url if it's a wikipedia image
                #if "wiki" in image_url:
                    #image_url = self.wiki_image_parser(image_url)
                res[mid]["image_url"] = image_url

            res[mid]["name"] = result.get('name')
            res[mid]["category"] = result.get('description')
            res[mid]["type"] = result.get('@type')[0].upper()

            detailed_description = result.get("detailedDescription")
            if detailed_description:
                res[mid]["summary"] = detailed_description.get('articleBody')
                res[mid]["url"] = detailed_description.get('url')

        return res

    def contextual_search_engine(self, talk):
        #build response object from various processing sources
        response = dict()

        #find rare words and define them
        rare_word_definitions = word_frequency.rare_word_define_string(talk)

        # get entities
        entities_raw = self.analyze_entities(talk)

        #filter entities
        entities = list()
        salience_threshold = 0.4
        metadata_keys_we_want = ["mid", "wikipedia_url"]
        for entity in entities_raw:
            #if the entitiy had a knowledge graph ID or wikipedia entry, then we want it
            for metadata_name, metadata_value in entity.metadata.items():
                if metadata_name in metadata_keys_we_want:
                    entities.append(entity)
                    break
            #if the entity had a location, then we want it
            if entity.type_ == "LOCATION":
                entities.append(entity)
                break
        #if the entity has a salience over n, then we want it (NOTE: salience may be high if transcript length is short)
            #if entity.salience >= salience_threshold:
                #entities.append(entity)
                #continue

        #if entities have `mid`s, then lookup the entities with google knowledge graph
        ## get all mid's first, as batch mid search is faster
        mids = list()
        for entity in entities:
            metadata = entity.metadata
            #print(entity.name)
            if "mid" in metadata.keys():
                mid = metadata["mid"]
                mids.append(mid)
        entity_search_results = self.lookup_mids(mids)

        #if entities are locations, then lookup the locations using google static maps
        locations = dict()
        for entity in entities:
            if language_v1.Entity.Type(entity.type_).name == "LOCATION":
                print("GOT LOCATION: {}".format(entity.name))
                zoom = 3
                mapImageName = "map_{}-{}.jpg".format(entity.name, zoom)
                mapImagePath = "{}/{}".format(self.imagePath, mapImageName)

                if not Path(mapImagePath).is_file():
                    print("{} doesn't exist - generating now...".format(mapImageName))
                    static_map_img_raw = self.get_google_static_map_img(place=entity.name, zoom=zoom)
                    static_map_img_pil = Image.open(BytesIO(static_map_img_raw))
                    #locations[entity.name]["image_raw"] = base64.b64encode(BytesIO(static_map_img_raw).getvalue())
                    static_map_img_pil.save(mapImagePath)
                locations[entity.name] = dict()
                locations[entity.name]["name"] = entity.name
                locations[entity.name]['map_image_path'] = "/image?img={}".format(mapImageName)

        #build response object from various processing sources
        response = dict()
        summary_len = 200

        #get rare word def's
        for word_def in rare_word_definitions:
            word = list(word_def.keys())[0]
            definition = list(word_def.values())[0]
            response[word] = dict()
            summary = definition[0:min(summary_len, len(definition))] + "..." #limit size of summary
            response[word]["summary"] = summary
            response[word]["type"] = "RARE_WORD"
            response[word]["name"] = word

        #get entities from search results
        for entity_mid in entity_search_results:
            entity = entity_search_results[entity_mid]
            response[entity["name"]] = entity
            summary = response[entity["name"]]["summary"]
            summary = summary[0:min(summary_len, len(summary))] + "..." #limit size of summary
            response[entity["name"]]["summary"] = summary

        #get entities from location results
        for location in locations:
            entity = locations[location]
            response[entity["name"]] = entity

        #drop things we've already defined, then remember the new things
#        filtered_response = dict()
#        for entity in response:
#            if entity not in self.previous_defs:
#                filtered_response[entity] = response[entity]
#                self.previous_defs.append(entity)

        #return filtered_response
        return response

    def get_wikipedia_image_link_from_page_title(self, page_title, language="en"):
        WIKI_REQUEST = 'http://{}.wikipedia.org/w/api.php?action=query&prop=pageimages&format=json&piprop=original&titles={}'.format(language, page_title)
        response  = requests.get(WIKI_REQUEST)
        json_data = json.loads(response.text)
        try:
            img_url = list(json_data['query']['pages'].values())[0]['original']['source']
            max_size = 480
            image_wikipedia_name = img_url.split("/")[-1]
            img_url = img_url.replace("/commons/", "/commons/thumb/")
            img_url = img_url.replace(f"/{language}/", f"/{language}/thumb/")
            img_url = img_url + f"/{max_size}px-{image_wikipedia_name}"
            if img_url[-3:] == "svg":
                img_url = img_url + ".png"
            elif img_url[-3:] == "ogv":
                img_url = None
        except Exception as e:
            print(e)
            img_url = None
        return img_url
