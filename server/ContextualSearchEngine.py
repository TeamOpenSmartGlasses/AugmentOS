import warnings
import word_frequency
import base64
import numpy as np
import pandas as pd
from fuzzysearch import find_near_matches
from nltk.corpus import stopwords
import nltk
from io import BytesIO
from PIL import Image
from googlemaps.maps import StaticMapPath
from googlemaps.maps import StaticMapMarker
import googlemaps
import responses
from server_config import google_maps_api_key
from constants import CUSTOM_USER_DATA_PATH
import requests
import json
import random
from pathlib import Path
import os
import uuid
import math
import time
from bs4 import BeautifulSoup
import warnings

from Summarizer import Summarizer

# Google NLP + Maps imports
from google.cloud import language_v1
from typing import Sequence
from google.cloud import enterpriseknowledgegraph as ekg
from server_config import gcp_project_id, path_modifier

# Google static maps imports

# custom data search
nltk.download('stopwords')

#language models
import torch
from transformers import GPT2LMHeadModel, GPT2Tokenizer
from txtai.pipeline import Similarity

#language models
import torch
from transformers import GPT2LMHeadModel, GPT2Tokenizer
from txtai.pipeline import Similarity

# image conversion

#custom
import word_frequency


def first_last_concat(s):
    words = s.split()
    if len(words) > 1:
        return words[0] + " " + words[-1]
    elif len(words) == 1:  # If the string contains only one word
        return words[0]
    else:
        return ''


def remove_html_tags(text):
    if not isinstance(text, str):
        text = str(text)
    return BeautifulSoup(text, "html.parser").get_text()


def remove_banned_words(s, banned_words):
    s = ' '.join([word.lower()
                 for word in s.split() if word.lower() not in banned_words])
    return s


class ContextualSearchEngine:
    def __init__(self, relevanceFilter, databaseHandler):
        # remember what we've defined
        self.previous_defs = list()
        self.client = googlemaps.Client(key=google_maps_api_key)
        self.imagePath = "images/cse"
        self.user_custom_data_path = "./custom_data/mit_media_lab/"
        self.relevanceFilter = relevanceFilter
        self.databaseHandler = databaseHandler
        self.summarizer = Summarizer(databaseHandler)

        self.max_window_size = 3

        self.custom_data = dict()

        self.banned_words = set(stopwords.words(
            "english") + ["mit", "MIT", "Media", "media"])
        description_banned_words = set(["mit", "MIT", "Media", "media"])

        # make names regular (first and last)
        # self.custom_data['people']['title'] = self.custom_data['people']['title'].apply(
        #     first_last_concat)

        # # get titles without stop/banned words
        # self.custom_data['projects']['title_filtered'] = self.custom_data['projects']['title'].apply(
        #     lambda x: remove_banned_words(x, self.banned_words))
        # self.custom_data['bookmarks']['title_filtered'] = self.custom_data['bookmarks']['title'].apply(
        #     lambda x: remove_banned_words(x, self.banned_words))
        # # get descriptions without stop/banned words
        # self.custom_data['projects']['description_filtered'] = self.custom_data['projects']['description'].apply(
        #     remove_html_tags).apply(lambda x: remove_banned_words(x, description_banned_words))
        # self.custom_data['projects']['description_filtered'] = self.custom_data['projects']['description'].apply(remove_html_tags).apply(lambda x: remove_banned_words(x, description_banned_words))

        #self.inference_device = "cuda:0" if torch.cuda.is_available() else "cpu"
        #self.similarity_func = Similarity("valhalla/distilbart-mnli-12-1", gpu=True)
        #self.tokenizer = GPT2Tokenizer.from_pretrained("gpt2")
        #self.model = GPT2LMHeadModel.from_pretrained("gpt2").to(self.inference_device)

    async def upload_user_data(self, user_id):
        user_folder_path = os.path.join('custom_data', str(user_id))

        # List all CSV files in the user-specific folder
        csv_files = [f for f in os.listdir(
            user_folder_path) if f.endswith('.csv')]

        # Read each CSV into a DataFrame
        dfs = [pd.read_csv(os.path.join(user_folder_path, csv_file))
               for csv_file in csv_files]

        # Concatenate all DataFrames into a single DataFrame
        concatenated_df = pd.concat(dfs, ignore_index=True)

        self.custom_data[user_id] = concatenated_df

    async def upload_user_data(self, user_id):
        user_folder_path = os.path.join('custom_data', str(user_id))

        # List all CSV files in the user-specific folder
        csv_files = [f for f in os.listdir(
            user_folder_path) if f.endswith('.csv')]

        # Read each CSV into a DataFrame
        dfs = [pd.read_csv(os.path.join(user_folder_path, csv_file))
               for csv_file in csv_files]

        # Concatenate all DataFrames into a single DataFrame
        concatenated_df = pd.concat(dfs, ignore_index=True)

        self.custom_data[user_id] = concatenated_df

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
        document = {"content": text_content,
                    "type_": type_, "language": language}

        # Available values: NONE, UTF8, UTF16, UTF32
        encoding_type = language_v1.EncodingType.UTF8

        response = client.analyze_entities(
            request={"document": document, "encoding_type": encoding_type}
        )

        return response.entities

    def lookup_mids(self, ids: Sequence[str], project_id=gcp_project_id):
        location = 'global'      # Values: 'global'
        # Optional: List of ISO 639-1 Codes
        languages = ['en']

        # Create a client
        client = ekg.EnterpriseKnowledgeGraphServiceClient()

        # The full resource name of the location
        # e.g. projects/{project_id}/locations/{location}
        parent = client.common_location_path(
            project=project_id, location=location)

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

            # get mid and start entry - assuming we always get a mid
            mid = None
            for identifier in result.get("identifier"):
                if identifier.get('name') == 'googleKgMID':
                    mid = identifier.get('value')
                    break

            if mid is None:
                continue

            res[mid] = dict()
            res[mid]["mid"] = mid

            # get google cloud id
            cloud_id = result.get('@id')

            # get image
            if result.get('image'):
                image_url = result.get('image').get('contentUrl')
                # convert to actual image url if it's a wikipedia image
                # if "wiki" in image_url:
                # image_url = self.wiki_image_parser(image_url)
                res[mid]["image_url"] = image_url

            res[mid]["name"] = result.get('name')
            res[mid]["category"] = result.get('description')

            # set our own types
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

    def is_custom_data_valid(self, df):
        if ('title' not in df) or ('description' not in df) or ('url' not in df):
            return False
        return True

    def upload_custom_user_data(self, user_id, df):
        user_folder_path = self.get_custom_data_folder(user_id)

        # Determine the next available file number
        existing_files = [f for f in os.listdir(
            user_folder_path) if f.startswith('data') and f.endswith('.csv')]
        existing_numbers = [int(f[4:-4]) for f in existing_files]
        next_file_num = 1 if not existing_numbers else max(existing_numbers) + 1

        # Save the DataFrame with the next available file number
        df_file_path = os.path.join(user_folder_path, f'data{next_file_num}.csv')
        df.to_csv(df_file_path, index=False)

        print(f"Data saved to: {df_file_path}")

        self.load_custom_user_data(user_id)
    
    def get_custom_data_folder(self, user_id):
        """Create user data folder if it doesn't exist."""
        path = "{}/{}".format(CUSTOM_USER_DATA_PATH, user_id)
        if not os.path.exists(path):
            os.makedirs(path)
            print(f"Folder '{path}' created!")
        else:
            print(f"Folder '{path}' already exists.")

        user_folder_path = os.path.join(
            CUSTOM_USER_DATA_PATH, str(user_id))
        
        return user_folder_path

    # Run this if the user does not have custom data loaded, or after a new data upload
    def load_custom_user_data(self, user_id):
        user_folder_path = self.get_custom_data_folder(user_id)

        # List all CSV files in the user-specific folder
        csv_files = [f for f in os.listdir(
            user_folder_path) if f.endswith('.csv')]

        # Read each CSV into a DataFrame
        dfs = [pd.read_csv(os.path.join(user_folder_path, csv_file))
               for csv_file in csv_files]

        # Concatenate all DataFrames into a single DataFrame
        if dfs:
            concatenated_df = pd.concat(dfs, ignore_index=True)

            concatenated_df = concatenated_df.dropna(subset=['title'])

            self.custom_data[user_id] = concatenated_df
        else:
            self.custom_data[user_id] = dict()

        print("SETUP CUSTOM DATA FOR USER {}, CUSTOM DATA FRAME IS BELOW:".format(user_id))
        print(self.custom_data[user_id])

    def contextual_search_engine(self, userId, talk):
        if talk == "":
            return

        if not self.does_user_have_custom_data_loaded(userId):
            self.load_custom_user_data(userId)

        # build response object from various processing sources
        response = dict()

        # find mentions of custom data entities
        entities_custom = self.ner_custom_data(userId, talk)

        # find rare words (including acronyms) and define them
        context = talk + \
            self.databaseHandler.getTranscriptsFromLastNSecondsForUserAsString(
                userId, 3)
        rare_word_definitions = word_frequency.rare_word_define_string(
            talk, context)

        # get entities
        entities_raw = self.analyze_entities(talk)

        # filter entities
        entities = list()
        salience_threshold = 0.4
        metadata_keys_we_want = ["mid", "wikipedia_url"]
        for entity in entities_raw:
            # if the entitiy had a knowledge graph ID or wikipedia entry, then we want it
            for metadata_name, metadata_value in entity.metadata.items():
                if metadata_name in metadata_keys_we_want:
                    entities.append(entity)
                    break
            # if the entity had a location, then we want it
            if entity.type_ == "LOCATION":
                entities.append(entity)
                break

        # if entities have `mid`s, then lookup the entities with google knowledge graph
        # get all mid's first, as batch mid search is faster
        mids = list()
        for entity in entities:
            metadata = entity.metadata
            # print(entity.name)
            if "mid" in metadata.keys():
                mid = metadata["mid"]
                mids.append(mid)
        entity_search_results = self.lookup_mids(mids)

        # if entities are locations, then add a map image to it
        locations = dict()
        for entity_mid in entity_search_results:
            entity = entity_search_results[entity_mid]
            if entity["type"] == "LOCATION":
                zoom = 3
                mapImageName = "map_{}-{}.jpg".format(entity["name"], zoom)
                mapImagePath = "{}/{}".format(self.imagePath, mapImageName)

                if not Path(mapImagePath).is_file():
                    static_map_img_raw = self.get_google_static_map_img(
                        place=entity["name"], zoom=zoom)
                    static_map_img_pil = Image.open(
                        BytesIO(static_map_img_raw))
                    static_map_img_pil.save(mapImagePath)

                entity_search_results[entity_mid]["map_image_path"] = "/api/{}image?img={}".format(
                    path_modifier, mapImageName)

        # build response object from various processing sources
        response = dict()

        # get rare word def's
        summary_len = 200
        for word_def in rare_word_definitions:
            word = list(word_def.keys())[0]
            definition = list(word_def.values())[0]
            response[word] = dict()
            # limit size of summary
            summary = definition[0:min(summary_len, len(definition))] + "..."
            response[word]["summary"] = summary
            response[word]["type"] = "RARE_WORD"
            response[word]["name"] = word

        # put search results into response
        for entity_mid in entity_search_results:
            entity = entity_search_results[entity_mid]
            response[entity["name"]] = entity

        # add custom NER entities to response
        response.update(entities_custom)

        # build response and summarize long entity descriptions
        for entity_name in response.keys():
            # get description
            description = response[entity_name]["summary"]

            # summarize entity if greater than n words long
            if (description != None) and (description != None) and (len(description.split(" ")) > 14):
                summary = self.summarizer.summarize_entity(description, context=context)
            elif description != None:
                summary = description
            else:
                print("======\nNO DESCRIPTION\n======")
                summary = "..."

            response[entity_name]["summary"] = summary

        # get entities from location results
        # for location in locations:
        #    entity = locations[location]
        #    response[entity["name"]] = entity

        # drop things we've already defined, then remember the new things
#        filtered_response = dict()
#        for entity in response:
#            if entity not in self.previous_defs:
#                filtered_response[entity] = response[entity]
#                self.previous_defs.append(entity)

        # return filtered_response
        if response == {}:
            print("\n\n===CSE RESPONSE EMPTY ===\n\n")
            return None

        # add timestamp and id to response
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
        WIKI_REQUEST = 'http://{}.wikipedia.org/w/api.php?action=query&prop=pageimages&format=json&piprop=original&titles={}'.format(
            language, page_title)
        response = requests.get(WIKI_REQUEST)
        json_data = json.loads(response.text)
        try:
            img_url = list(json_data['query']['pages'].values())[
                0]['original']['source']
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

    def does_user_have_custom_data_loaded(self, user_id):
        if user_id not in self.custom_data: return False
        if not isinstance(self.custom_data[user_id], pd.DataFrame): return False
        if self.custom_data[user_id].empty: return False
        return True

    def ner_custom_data(self, user_id, talk):
        if not self.does_user_have_custom_data_loaded(user_id): return {}

        words = [word for word in talk.split() if (
            word.lower() not in self.banned_words and not word.isnumeric())]

        matches = dict()
        config = {
                        "entity_column_name": "title",
                        "entity_column_name_filtered": "title",
                        "entity_column_description": "description",
                        "max_window_size": self.max_window_size,
                        "max_deletions": 2,
                        "max_insertions": 2,
                        "max_substitutions": 2,
                        "max_l_dist": 3,
                        "compute_entropy": True,
                    }
        
        # get custom data
        # all custom data has a title, a filtered title (for searching), and a description
        # get the titles to show in UI
        titles = self.custom_data[user_id][config["entity_column_name"]].tolist()

        # get descriptions to show in UI
        descriptions = self.custom_data[user_id][config["entity_column_description"]].tolist()

        # get entity names to match, that have been pre-filtered
        entity_names_to_match_filtered = self.custom_data[user_id][config['entity_column_name_filtered']].tolist()
        # descriptions_filtered = self.custom_data[data_type_key]['description_filtered']

        # get URLs, if they exist
        urls = self.custom_data[user_id]['url'].tolist() if (
            'url' in self.custom_data[user_id]) else None

        # run brute force NER on transcript using custom data
        matches_idxs = self.find_combinations(
            words=words,
            entities=list(enumerate(entity_names_to_match_filtered)),
            config=config,
            descriptions=descriptions,
            context=talk
        )

        # build response object
        for mi in matches_idxs:
            matches[titles[mi]] = dict()
            matches[titles[mi]]["name"] = titles[mi]
            matches[titles[mi]]["summary"] = descriptions[mi] if descriptions[mi] is not np.nan else None
            if urls is not None:
                matches[titles[mi]]["url"] = urls[mi]
            else:
                matches[titles[mi]]["url"] = None

        self.custom_data[user_id]
        # DEV/TODO - we still return too many false positives sometimes, so limit return if we fail and give a list that is unreasonably big
        unreasonable_num = 6

        def remove_random_false_positives(d, max_keys):
            while len(d) > max_keys:
                d.pop(random.choice(list(d.keys())))

        remove_random_false_positives(matches, unreasonable_num)

        return matches

    # def get_similarity(self, context, string_to_match):
    #     similarity = self.similarity_func(string_to_match, [context])
    #     return similarity
    
    # def word_sequence_entropy(self, sequence):
    #     input_ids = self.tokenizer.encode(sequence, return_tensors='pt')
    #     token_count = input_ids.size(1)

        output = self.model(input_ids, labels=input_ids)

        log_likelihood = output[0].item()
        normalized_score = 1 / (1 + np.exp(-log_likelihood / token_count))
        return normalized_score

    def search_name(self, to_search, entities, config, descriptions=None, context=None):
        max_deletions = config["max_deletions"]
        max_insertions = config["max_insertions"]
        max_substitutions = config["max_substitutions"]
        compute_entropy = config["compute_entropy"]
        max_l_dist = config["max_l_dist"]

        matches = list()

        def get_whole_match(match_entity, full_string):
            start_idx = match_entity.start #inclusive
            end_idx = match_entity.end #exclusive

            substring = full_string[start_idx:end_idx]

            #add characters before until first character or whitespace
            while start_idx > 0:
                start_idx -= 1
                pre_char = full_string[start_idx]
                if pre_char not in [" ", "\n", "\r", ",", ":", ";"]:
                    substring = pre_char + substring
                else:
                    break
            #add characters after until first character or whitespace
            while end_idx < len(full_string):
                end_idx += 1
                post_char = full_string[end_idx - 1]
                if post_char not in [" ", "\n", "\r", ",", ":", ";"]:
                    substring = substring + post_char
                else:
                    break

            return substring

        for idx, entity in entities:

            #if (to_search in entity) or (to_search == entity):
                #print("************************ FOUNNNNNDD EXACT MATCH")
                #print(entity)
                #print(to_search)
                #matches.append(idx)
                #continue

            match_entities = find_near_matches(
                to_search.lower(),
                entity.lower(),
                max_deletions=max_deletions,
                max_insertions=max_insertions,
                max_substitutions=max_substitutions,
                max_l_dist=max_l_dist,
            )

            # and (not compute_entropy or (self.get_similarity(descriptions[idx], context)[0][1] > 0.3 and self.word_sequence_entropy(to_search) > 0.94)):
            if match_entities:
                for match_entity in match_entities:
                    #match_entity = match_entities[0]
                    #first check if match is true by making sure what is said is similiar length to match
                    #get length of substring that matched
                    match_len = match_entity.end - match_entity.start
                    #get length of all the words that that substring belonged to
                    whole_match = get_whole_match(match_entity, entity)
                    if (abs(len(whole_match) - len(to_search)) >= 3):
                        continue
                    print("TRUE MATCH")
                    print("--- WHOLEMATCH", whole_match)
                    print("--- to_search", to_search)
                    print("--- entity", entity)
                    matches.append(idx)
                    #print(match_entity)
                    #print(self.get_similarity(descriptions[idx], context)[0][1] if compute_entropy else None)
                    #print(self.word_sequence_entropy(to_search))
                    #print(descriptions[idx] if compute_entropy else None)
                    #print(context)
                    #print('-------------------------------')
                    continue

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
                    print("checking combo: {}".format(combination))
                    curr_matches = self.search_name(
                        combination,
                        entities,
                        config,
                        descriptions,
                        context
                    )
                    matches_idxs.extend(curr_matches)

        print(combinations_set)

        return matches_idxs
