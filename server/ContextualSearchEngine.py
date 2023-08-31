import requests
import json
import random
from pathlib import Path
import os
import uuid
import math
import time
from bs4 import BeautifulSoup

#Google NLP + Maps imports
from google.cloud import language_v1
from typing import Sequence
from google.cloud import enterpriseknowledgegraph as ekg
from server_config import gcp_project_id, path_modifier

#OpenAI imports
import openai
openai.api_key = os.environ['OPENAI_API_KEY']

#Google static maps imports
from server_config import google_maps_api_key
import responses
import random
import googlemaps
from googlemaps.maps import StaticMapMarker
from googlemaps.maps import StaticMapPath
from PIL import Image
from io import BytesIO

# custom data search
import nltk
from nltk.corpus import stopwords
from fuzzysearch import find_near_matches
import pandas as pd
import numpy as np
nltk.download('stopwords')

#image conversion
import base64

#custom
import word_frequency

# from transformers import GPT2LMHeadModel, GPT2Tokenizer
# from txtai.pipeline import Similarity

import warnings


def first_last_concat(s):
    words = s.split()
    if len(words) > 1:
        return words[0] + " " +  words[-1]
    elif len(words) == 1:  # If the string contains only one word
        return words[0]
    else:
        return ''


def remove_html_tags(text):
    if not isinstance(text, str):
        text = str(text)
    return BeautifulSoup(text, "html.parser").get_text()


def remove_banned_words(s, banned_words):
    s = ' '.join([word.lower() for word in s.split() if word.lower() not in banned_words])
    return s


class ContextualSearchEngine:
    def __init__(self, relevanceFilter, databaseHandler):
        #remember what we've defined
        self.previous_defs = list()
        self.client = googlemaps.Client(key=google_maps_api_key)
        self.imagePath = "images/cse"
        self.relevanceFilter = relevanceFilter
        self.databaseHandler = databaseHandler

        self.max_window_size = 3

        custom_data_path = "./custom_data/mit_media_lab/"
        data_people = [custom_data_path + "people.csv"]
        data_projects = [custom_data_path + "projects.csv"]
        data_bookmarks = [custom_data_path + "bookmarks_1.csv"]

        people = pd.concat([pd.read_csv(path).dropna(subset=['name']) for path in data_people])
        projects = pd.concat([pd.read_csv(path).dropna(subset=['title']) for path in data_projects])
        bookmarks = pd.concat([pd.read_csv(path).dropna(subset=['title']) for path in data_bookmarks])

        print(people)
        print(projects)
        print(bookmarks)

        self.custom_data = {
            "people": people,
            "projects": projects,
            "bookmarks": bookmarks,
        }

        self.banned_words = set(stopwords.words("english") + ["mit", "MIT", "Media", "media"])
        description_banned_words = set(["mit", "MIT", "Media", "media"])

        #make names regular (first and last)
        self.custom_data['people']['name'] = self.custom_data['people']['name'].apply(first_last_concat)

        #get titles without stop/banned words
        self.custom_data['projects']['title_filtered'] = self.custom_data['projects']['title'].apply(lambda x: remove_banned_words(x, self.banned_words))
        self.custom_data['bookmarks']['title_filtered'] = self.custom_data['bookmarks']['title'].apply(lambda x: remove_banned_words(x, self.banned_words))
        #get descriptions without stop/banned words
        self.custom_data['projects']['description_filtered'] = self.custom_data['projects']['description'].apply(remove_html_tags).apply(lambda x: remove_banned_words(x, description_banned_words))
        #self.custom_data['projects']['description_filtered'] = self.custom_data['projects']['description'].apply(remove_html_tags).apply(lambda x: remove_banned_words(x, description_banned_words))

        # self.similarity_func = Similarity("valhalla/distilbart-mnli-12-1", gpu=False)
        # self.tokenizer = GPT2Tokenizer.from_pretrained("gpt2")
        # self.model = GPT2LMHeadModel.from_pretrained("gpt2")

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

    def summarize_entity(self, entity_description: str, chars_to_use=1250):
        #shorten entity_description if too long
        entity_description = entity_description[:min(chars_to_use, len(entity_description))]

        #make prompt
        #like "the" and "a" if they aren't useful to human understanding
        prompt = f"""Please summarize the following "entity description" text to 8 words or less, extracting the most important information about the entity. The summary should be easy to parse very quickly. Leave out filler words. Don't write the name of the entity. Use less than 8 words for the entire summary. Be concise, brief, and succinct.

        Example:
        [INPUT]
        "George Washington (February 22, 1732 – December 14, 1799) was an American military officer, statesman, and Founding Father who served as the first president of the United States from 1789 to 1797."

        [OUTPUT]
        First American president, military officer, Founding Father.

        Example:
        [INPUT]
        "ChatGPT is an artificial intelligence chatbot developed by OpenAI and released in November 2022. It is built on top of OpenAI's GPT-3.5 and GPT-4 families of large language models and has been fine-tuned using both supervised and reinforcement learning techniques."
        [OUTPUT]
        AI chatbot using GPT models.

        \n Text to summarize: \n{entity_description} \nSummary (8 words or less): """
        # print("Running prompt for summary: \n {}".format(prompt))
        chat_completion = openai.Completion.create(model="text-davinci-002", prompt=prompt, temperature=0.5, max_tokens=20)
        response = chat_completion.choices[0].text
        # print(response)
        return response

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
        try:
            response = client.lookup(request=request)
        except Exception as e:
            print("Error with Google Knowledge Graph request:")
            print(e)
            return []

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

            #set our own types
            if any(x in ['Place', 'City', 'AdministrativeArea'] for x in result.get('@type')):
                res[mid]["type"] = "LOCATION"
            else:
                res[mid]["type"] = result.get('@type')[0].upper()

            detailed_description = result.get("detailedDescription")
            if detailed_description:
                res[mid]["summary"] = detailed_description.get('articleBody')
                res[mid]["url"] = detailed_description.get('url')
            else:
                res[mid]["summary"] = result.get('description')

        return res

    def contextual_search_engine(self, userId, talk):
        if talk == "":
            return

        #build response object from various processing sources
        response = dict()

        # find mentions of custom data entities
        entities_custom = self.ner_custom_data(talk)
        
        print("----------------CUSTOM ENTITIES--------------------")
        print(entities_custom)
        print("------------------------------------")

        #find rare words (including acronyms) and define them
        context = talk + self.databaseHandler.getTranscriptsFromLastNSecondsForUserAsString(userId, 3)
        rare_word_definitions = word_frequency.rare_word_define_string(talk, context)

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

        #if entities are locations, then add a map image to it
        locations = dict()
        for entity_mid in entity_search_results:
            entity = entity_search_results[entity_mid]
            if entity["type"] == "LOCATION":
                zoom = 3
                mapImageName = "map_{}-{}.jpg".format(entity["name"], zoom)
                mapImagePath = "{}/{}".format(self.imagePath, mapImageName)

                if not Path(mapImagePath).is_file():
                    static_map_img_raw = self.get_google_static_map_img(place=entity["name"], zoom=zoom)
                    static_map_img_pil = Image.open(BytesIO(static_map_img_raw))
                    static_map_img_pil.save(mapImagePath)

                entity_search_results[entity_mid]["map_image_path"] = "/api/{}image?img={}".format(path_modifier, mapImageName)

        #build response object from various processing sources
        response = dict()

        #get rare word def's
        summary_len = 200
        for word_def in rare_word_definitions:
            word = list(word_def.keys())[0]
            definition = list(word_def.values())[0]
            response[word] = dict()
            summary = definition[0:min(summary_len, len(definition))] + "..." #limit size of summary
            response[word]["summary"] = summary
            response[word]["type"] = "RARE_WORD"
            response[word]["name"] = word

        #put search results into response
        for entity_mid in entity_search_results:
            entity = entity_search_results[entity_mid]
            response[entity["name"]] = entity

        #add custom NER entities to response
        response.update(entities_custom)

        #build response and summarize long entity descriptions
        for entity_name in response.keys():
            #get description
            description = response[entity_name]["summary"]

            #summarize entity if greater than n words long
            if (description != None) and (description != None) and (len(description.split(" ")) > 14):
                summary = self.summarize_entity(description)
            elif description != None:
                summary = description
            else:
                print("======\nNO DESCRIPTION\n======")
                summary = "..."

            response[entity_name]["summary"] = summary

        #get entities from location results
        #for location in locations:
        #    entity = locations[location]
        #    response[entity["name"]] = entity

        #drop things we've already defined, then remember the new things
#        filtered_response = dict()
#        for entity in response:
#            if entity not in self.previous_defs:
#                filtered_response[entity] = response[entity]
#                self.previous_defs.append(entity)

        #return filtered_response
        if response == {}: 
            print("\n\n===CSE RESPONSE EMPTY ===\n\n")
            return None

        #add timestamp and id to response
        for i in response:
            print(i)
            response[i]['timestamp'] = math.trunc(time.time())
            response[i]['uuid'] = str(uuid.uuid4())

        # Format response into list of individual items
        responses = []
        for attr, value in response.items():
            responses.append(value)

        return responses

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

    def ner_custom_data(self, talk):
        words = [word for word in talk.split() if (word.lower() not in self.banned_words and not word.isnumeric())]

        matches = dict()
        for data_type_key in self.custom_data.keys():
            match data_type_key:
                case "people":
                    config = {
                        "entity_column_name": "name",
                        "entity_column_name_filtered": "name",
                        "entity_column_description": "name",
                        "max_window_size": 2,
                        "max_deletions": 3,
                        "max_insertions": 3,
                        "max_substitutions": 3,
                        "max_l_dist": 3,
                        "compute_entropy": False,
                    }

                case "projects":
                    config = {
                        "entity_column_name": "title",
                        "entity_column_name_filtered": "title_filtered",
                        "entity_column_description": "description",
                        "max_window_size": self.max_window_size,
                        "max_deletions": 2,
                        "max_insertions": 2,
                        "max_substitutions": 2,
                        "max_l_dist": 2,
                        "compute_entropy": True,
                    }

                case "bookmarks":
                    config = {
                        "entity_column_name": "title",
                        "entity_column_name_filtered": "title_filtered",
                        "entity_column_description": "text",
                        "max_window_size": self.max_window_size,
                        "max_deletions": 2,
                        "max_insertions": 2,
                        "max_substitutions": 2,
                        "max_l_dist": 2,
                        "compute_entropy": True,
                    }

                case _:
                    warnings.warn("Missing Config for this type of entities", UserWarning)
                    return []


            # get custom data
            # all custom data has a title, a filtered title (for searching), and a description
            #get the titles to show in UI
            titles = self.custom_data[data_type_key][config["entity_column_name"]].tolist()

            #get descriptions to show in UI
            print(data_type_key)
            print(self.custom_data[data_type_key])
            descriptions = self.custom_data[data_type_key][config["entity_column_description"]].tolist()

            #get entity names to match, that have been pre-filtered
            entity_names_to_match_filtered = self.custom_data[data_type_key][config['entity_column_name_filtered']].tolist()
            #descriptions_filtered = self.custom_data[data_type_key]['description_filtered']

            #get URLs, if they exist
            urls = self.custom_data[data_type_key]['url'].tolist() if ('url' in self.custom_data[data_type_key]) else None

            # run brute force NER on transcript using custom data
            matches_idxs = self.find_combinations(
                words=words,
                entities=list(enumerate(entity_names_to_match_filtered)),
                config=config,
                descriptions=descriptions,
                context=talk
            )

            #build response object
            for mi in matches_idxs:
                matches[titles[mi]] = dict()
                matches[titles[mi]]["name"] = titles[mi]
                matches[titles[mi]]["summary"] = descriptions[mi] if descriptions[mi] is not np.nan else None
                if urls is not None:
                    matches[titles[mi]]["url"] = urls[mi]
                else:
                    matches[titles[mi]]["url"] = None

        #DEV/TODO - we still return too many false positives sometimes, so limit return if we fail and give a list that is unreasonably big
        unreasonable_num = 6
        
        def remove_random_false_positives(d, max_keys):
            while len(d) > max_keys:
                d.pop(random.choice(list(d.keys())))
        
        remove_random_false_positives(matches, unreasonable_num)

        print("=========== CSE RESPONSE: =========")
        print(matches)
        return matches

    # def get_similarity(self, context, string_to_match):
    #     similarity = self.similarity_func(string_to_match, [context])
    #     return similarity
    
    # def word_sequence_entropy(self, sequence):
    #     input_ids = self.tokenizer.encode(sequence, return_tensors='pt')
    #     token_count = input_ids.size(1)

    #     output = self.model(input_ids, labels=input_ids)

    #     log_likelihood = output[0].item()
    #     normalized_score = 1 / (1 + np.exp(-log_likelihood / token_count))
    #     return normalized_score

    def search_name(self, to_search, entities, config, descriptions=None, context=None):
        max_deletions = config["max_deletions"]
        max_insertions = config["max_insertions"]
        max_substitutions = config["max_substitutions"]
        compute_entropy = config["compute_entropy"]
        max_l_dist = config["max_l_dist"]

        matches = list()

        for idx, entity in entities:

            match_entity = find_near_matches(
                to_search,
                entity,
                max_deletions=max_deletions,
                max_insertions=max_insertions,
                max_substitutions=max_substitutions,
                max_l_dist=max_l_dist,
            )

            if match_entity: # and (not compute_entropy or (self.get_similarity(descriptions[idx], context)[0][1] > 0.3 and self.word_sequence_entropy(to_search) > 0.94)):
                matches.append(idx)
                # print("to_search", to_search)
                # print("entity", entity)
                # print(match_entity)
                # print(self.get_similarity(descriptions[idx], context)[0][1] if compute_entropy else None)
                # # print(word_sequence_entropy(to_search))
                # print(descriptions[idx] if compute_entropy else None)
                # print(context)
                # print('-------------------------------')
                break

        return matches
    
    def find_combinations(self, words, entities, config, descriptions=None, context=None):
        """
        Returns the indices of entities that match.
        """
        matches_idxs = []
        combinations_set = set()

        for window_size in range(2, config["max_window_size"] + 1):
            for i in range(len(words) - window_size + 1):
                combination = ' '.join(words[i:i + window_size])

                if combination not in combinations_set:
                    combinations_set.add(combination)
                    curr_matches = self.search_name(
                        combination,
                        entities,
                        config,
                        descriptions,
                        context
                    )
                    matches_idxs.extend(curr_matches)

        return matches_idxs
