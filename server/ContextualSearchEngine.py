from txtai.pipeline import Similarity
import re
import torch
import warnings
import base64
import numpy as np
import pandas as pd
from fuzzysearch import find_near_matches
from rapidfuzz import fuzz
from rapidfuzz import process as rapidfuzz_process
from nltk.corpus import stopwords
from io import BytesIO
from PIL import Image
import googlemaps
import responses
import requests
import json
import random
from pathlib import Path
import os
import uuid
import math
import time
from bs4 import BeautifulSoup
from txtai.embeddings import Embeddings
from Modules.update_embeddings import update_embeddings

# Convoscope
from Modules.Summarizer import Summarizer
import Modules.word_frequency as word_frequency
from constants import CUSTOM_USER_DATA_PATH, USE_GPU_FOR_INFERENCING, SUMMARIZE_CUSTOM_DATA, DEFINE_RARE_WORDS, IMAGE_PATH
from server_config import google_maps_api_key

# Google NLP
from google.cloud import language_v1
from typing import Sequence
from google.cloud import enterpriseknowledgegraph as ekg
from server_config import gcp_project_id, path_modifier

# Google static maps
from googlemaps.maps import StaticMapPath
from googlemaps.maps import StaticMapMarker


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


def find_combinations(words, window_size):
    """
    Returns all unique contiguous combinations of words within windowsize
    """
    combinations_set = set()

    for window_size in range(2, window_size + 1):
        for i in range(len(words) - window_size + 1):
            combination = ' '.join(words[i:i + window_size])

            combinations_set.add(combination)

    # return {' '.join(words[i:i + size]) for size in range(2, window_size + 1) for i in range(len(words) - size + 1)}

    return combinations_set


class ContextualSearchEngine:
    def __init__(self, db_handler):
        self.client = googlemaps.Client(key=google_maps_api_key)
        self.user_custom_data_path = "./custom_data/"
        self.db_handler = db_handler
        self.summarizer = Summarizer(db_handler)

        # load the word frequency index
        word_frequency.load_word_freq_indices()

        self.max_window_size = 3

        self.custom_data = dict()
        self.custom_embeddings = dict()

        self.banned_words = set(stopwords.words(
            "english") + ["mit", "MIT", "Media", "media", "really", "yeah", "we're", "thing", "going", "hey", "that", "OK", "like", "right", "one", "I'm", "to", "pretty", "I", "think", "so", "get", "has", "have"])

        # if USE_GPU_FOR_INFERENCING:
        #     self.inference_device = "cuda:0" if torch.cuda.is_available() else "cpu"
        # else:
        #     self.inference_device = "cpu"

        # self.similarity_func = Similarity(
        #     "valhalla/distilbart-mnli-12-1", gpu=(USE_GPU_FOR_INFERENCING))

    def semantic_search_custom_data(self, user_id):
        # first, get the context, and the summary of that context
        context = self.db_handler.get_transcripts_from_last_nseconds_for_user_as_string(user_id, 60)
        context_summary = self.summarizer.summarize_description_with_bert(context)
        query = context_summary

        # run semantic search
        # print(f"@@@@@@@@@@ Semantic searching {query} for user {user_id}")
        query_stripped = query.replace("\"", "")
        results = self.custom_embeddings[user_id].search(f"select id, text, score, tags from txtai where similar(\"{query_stripped}\") order by score DESC", limit=10)
        filtered_results = dict()

        # get best semantic search results and put them into proper data structure
        for result in results:
            if result["score"] > 0.55:
                title = result["id"]
                tags = json.loads(result["tags"])
                description = tags["description"]
                url = tags["url"]
                print("Got semantic search match:")
                print(f"-- Semantic match title: {title}")
                print(f"-- Semantic match desc.: {description}")
                print(f"-- Semantic match url.: {url}")
                print("\n********")
                res_obj = {"name" : title, "summary" : description, "url" : url}
                filtered_results[title] = res_obj
            else:
                break

        return filtered_results

    async def load_user_data(self, user_id):
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

        # load user data embeddings
        print(f"Loading embeddings for {user_id}...")
        self.custom_embeddings[user_id].load(
            f"{user_folder_path}/custom_data_embeddings.txtai")
        print(f"-- Loaded embeddings for {user_id}...")

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
        next_file_num = 1 if not existing_numbers else max(
            existing_numbers) + 1

        # Save the DataFrame with the next available file number
        df_file_path = os.path.join(
            user_folder_path, f'data{next_file_num}.csv')
        df.to_csv(df_file_path, index=False)

        # print(f"Data saved to: {df_file_path}")

        # Update the embeddings
        update_embeddings(df, user_id)

        self.load_custom_user_data(user_id)

    def get_custom_data_folder(self, user_id):
        """Create user data folder if it doesn't exist."""
        path = "{}/{}".format(CUSTOM_USER_DATA_PATH, user_id)
        if not os.path.exists(path):
            os.makedirs(path)
            # print(f"Folder '{path}' created!")
        else:
            # print(f"Folder '{path}' already exists.")
            pass

        user_folder_path = os.path.join(
            CUSTOM_USER_DATA_PATH, str(user_id))

        return user_folder_path

    # Run this if the user does not have custom data loaded, or after a new data upload
    def load_custom_user_data(self, user_id):
        user_folder_path = self.get_custom_data_folder(user_id)

        # List all CSV files in the user-specific folder
        csv_files = [f for f in os.listdir(
            user_folder_path) if f.endswith('.csv')]

        # print("FOUND FILES FOR {user_id}: ")
        # print(csv_files)

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

        # print("SETUP CUSTOM DATA FOR USER {}, CUSTOM DATA FRAME IS BELOW:".format(user_id))
        # print(self.custom_data[user_id])

        # setup custom embeddings for user
        custom_embeddings_path = f"{self.user_custom_data_path}/{user_id}/custom_data_embeddings.txtai"
        # print(f"Loading embeddings for {user_id}...")
        self.custom_embeddings[user_id] = Embeddings(
            {"path": "sentence-transformers/paraphrase-MiniLM-L3-v2", "content": True})
        if (os.path.exists(custom_embeddings_path)):
            self.custom_embeddings[user_id].load(custom_embeddings_path)
            # print(f"-- Populated embeddings loaded for {user_id}...")
        # else:
            # print(f"-- Empty embeddings only loaded for {user_id}...")

    def contextual_search_engine(self, user_id, talk):
        if talk.strip() == "":
            return

        if not self.does_user_have_custom_data_loaded(user_id):
            self.load_custom_user_data(user_id)

        # build response object from various processing sources
        response = dict()

        # find mentions of custom data entities
        entities_custom = self.fuzzy_search_on_user_custom_data(user_id, talk)
 
        # run semantic search
        entities_semantic_custom = self.semantic_search_custom_data(user_id)

        # get entities
        entities_raw = self.analyze_entities(talk)

        # filter entities
        entities = list()
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

        # if entities have `mid`s, then lookup the entities with google knowledge graph, get all mid's first, as batch mid search is faster
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
                map_image_name = "map_{}-{}.jpg".format(entity["name"], zoom)
                map_image_path = "{}/{}".format(IMAGE_PATH, map_image_name)

                if not Path(map_image_path).is_file():
                    static_map_img_raw = self.get_google_static_map_img(
                        place=entity["name"], zoom=zoom)
                    static_map_img_pil = Image.open(
                        BytesIO(static_map_img_raw))
                    static_map_img_pil.save(map_image_path)

                entity_search_results[entity_mid]["map_image_path"] = "/api/{}image?img={}".format(
                    path_modifier, map_image_name)

        # build response object from various processing sources
        response = dict()

        # find rare words (including acronyms) and define them
        rare_word_context = self.db_handler.get_transcripts_from_last_nseconds_for_user_as_string(user_id, 3)
        
        # get rare word def's
        if DEFINE_RARE_WORDS:
            #find the rare words and their definitions
            rare_word_definitions = word_frequency.rare_word_define_string(talk, rare_word_context)
            # summarize the definitions by cutting them short
            summary_len = 180
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
        response.update(entities_semantic_custom)

        # find rare words (including acronyms) and define them
        summaries_context = self.db_handler.get_transcripts_from_last_nseconds_for_user_as_string(user_id, 180)
        
        # build response and summarize long entity descriptions
        for entity_name in response.keys():
            # get description
            description = response[entity_name]["summary"]

            # summarize entity if greater than n words long
            if (description != None) and (description != None) and (len(description.split(" ")) > 14):
                summary = self.summarizer.summarize_entity(description, context=summaries_context)
            elif description != None:
                summary = description
            else:
                summary = "..."

            response[entity_name]["summary"] = summary

        # return None if no results
        if response == {}:
            # print("\n\n===CSE RESPONSE EMPTY ===\n\n")
            return None

        # add timestamp and id to each response
        for i in response:
            print(i)
            response[i]['timestamp'] = math.trunc(time.time())
            response[i]['uuid'] = str(uuid.uuid4())

        # format response into list of individual items
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
        if user_id not in self.custom_data:
            return False
        if not isinstance(self.custom_data[user_id], pd.DataFrame):
            return False
        if self.custom_data[user_id].empty:
            return False
        return True

    def fuzzy_search_on_user_custom_data(self, user_id, talk):
        if not self.does_user_have_custom_data_loaded(user_id):
            print("User {} does not have custom data loaded".format(user_id))
            print("=========================================================================")
            return {}
        else:
            pass
            #print("User {} has custom data loaded".format(user_id), "=========================================================================")

        # split the text to seach with into individual words
        words = talk.split()

        # setup some parameters for the fuzzy search
        config = {
            "entity_column_name": "title",
            "entity_column_name_filtered": "title",
            "entity_column_description": "description",
            "entity_column_images": "image_url",
            "max_deletions": 1,
            "max_insertions": 1,
            "max_substitutions": 2,
            "max_l_dist": 3,
            "compute_entropy": True,
        }

        # get titles
        titles = self.custom_data[user_id][config["entity_column_name"]].tolist()

        # get descriptions
        descriptions = self.custom_data[user_id][config["entity_column_description"]].tolist()

        # get entity names to match
        entity_names_to_match_filtered = self.custom_data[user_id][config['entity_column_name_filtered']].tolist()

        # get URLs, if they exist
        urls = self.custom_data[user_id]['url'].tolist() if ('url' in self.custom_data[user_id]) else None

        #get image urls
        image_urls = self.custom_data[user_id][config['entity_column_images']].tolist() if ('image_url' in self.custom_data[user_id]) else None

        # run brute force NER on transcript using custom data
        word_combos = find_combinations(words, self.max_window_size)

        start_time = time.time()
        matches_idxs = self.custom_fuzzy_search(word_combos, entity_names_to_match_filtered, config)
        #print("custom_fuzzy_search ran in {} on combo '{}'".format(time.time() - start_time, word_combos))

        # run combinations through the fuzzy search
        # matches_idxs = list()
        # for combination in word_combos:
        #     ctime = time.time()
        #     curr_matches = self.custom_fuzzy_search(
        #         combination,
        #         list(entity_names_to_match_filtered),
        #         config
        #     )
        #     # print("custom_fuzzy_search ran in {} on combo '{}'".format(time.time() - ctime, combination))
        #     matches_idxs.extend(curr_matches)

        # build response object
        matches = dict()
        for mi in matches_idxs:
            matches[titles[mi]] = dict()
            matches[titles[mi]]["name"] = titles[mi]
            matches[titles[mi]]["summary"] = descriptions[mi] if descriptions[mi] is not np.nan else None
            if image_urls is not None:
                if image_urls[mi] is not np.nan:
                    matches[titles[mi]]["image_url"] = image_urls[mi]
                else:
                    matches[titles[mi]]["image_url"] = None
            else:
                matches[titles[mi]]["image_url"] = None

            if urls is not None:
                c_url = urls[mi]
                if (c_url is not None) and (c_url is not np.nan):
                    matches[titles[mi]]["url"] = c_url
                else:
                    matches[titles[mi]]["url"] = None
            else:
                matches[titles[mi]]["url"] = None

        # self.custom_data[user_id]
        # this is mostly unneeded as we rarely return too many results, but this is here just in case we do return too many results
        unreasonable_num = 4

        def remove_random_false_positives(d, max_keys):
            while len(d) > max_keys:
                d.pop(random.choice(list(d.keys())))

        remove_random_false_positives(matches, unreasonable_num)

        return matches

    def get_string_freq(self, text):
        freq_indexes = list()
        for word in text.split():
            freq_index = word_frequency.get_word_freq_index(word)
            freq_indexes.append(freq_index)
        return np.mean(freq_indexes)

    def custom_fuzzy_search(self, combinations_to_search, entities, config):
        max_deletions = config["max_deletions"]
        max_insertions = config["max_insertions"]
        max_substitutions = config["max_substitutions"]
        # compute_entropy = config["compute_entropy"]
        max_l_dist = config["max_l_dist"]

        filtered_combinations_to_search = list()
        # before searching, check a few things to make sure the search is worth doing
        # some combinations are super short and not worth searching because they yield false positives
        for to_search in combinations_to_search:
            if len(to_search) < 8:
                continue
            #only run to_searchs that don't contain too many filler words
            individual_words = to_search.split()
            num_banned = 0
            for word in individual_words:
                if word in self.banned_words:
                    num_banned += 1
            if (num_banned / len(individual_words)) >= 0.4:
                continue
            # don't even try search if the to_search is too high frequency
            to_search_string_freq_index = self.get_string_freq(to_search)
            if (len(individual_words) <= 2) and (to_search_string_freq_index < 0.03): # if there are 1-2 words to search and the index is below this, don't run
                # print(f"--- Didn't search '{to_search}' because too common words, index {to_search_string_freq_index}")
                continue
            if (len(individual_words) > 3) and (to_search_string_freq_index < 0.03): # if there are 1-2 words to search and the index is below this, don't run
                # print(f"--- Didn't search '{to_search}' because too common words, index {to_search_string_freq_index}")
                continue

            filtered_combinations_to_search.append(to_search)

        # print(f"INSTEAD --- are search '{to_search}' because rare enough words, index {to_search_string_freq_index}")
        # helper functions for fuzzy search
        def get_whole_match(match_entity, full_string):
            start_idx = match_entity.start  # inclusive
            end_idx = match_entity.end  # exclusive

            substring = full_string[start_idx:end_idx]

            # add characters before until first character or whitespace
            while start_idx > 0:
                start_idx -= 1
                pre_char = full_string[start_idx]
                if pre_char not in [" ", "\n", "\r", ",", ":", ";"]:
                    substring = pre_char + substring
                else:
                    break
            # add characters after until first character or whitespace
            while end_idx < len(full_string):
                end_idx += 1
                post_char = full_string[end_idx - 1]
                if post_char not in [" ", "\n", "\r", ",", ":", ";"]:
                    substring = substring + post_char
                else:
                    break

            return substring

        def count_capitals(text):
            return sum(1 for char in text if char.isupper())

        def pascal_to_words(pascal_str):
            try:
                return ' '.join(re.findall(r'[A-Z]?[a-z]+|[A-Z]+(?=[A-Z]|$)', pascal_str))
            except TypeError:
                print("ERROR WITH PASCAL TO WORDS", pascal_str)
                return ' '.join(re.findall(r'[A-Z]?[a-z]+|[A-Z]+(?=[A-Z]|$)', pascal_str[0]))

        if not filtered_combinations_to_search:
            return []

        filtered_combinations_to_search = list(filtered_combinations_to_search)

        matches = list()
        # for idx, entity in entities:
        # use fuzzysearch to run first search

        # print("###################################################")
        # print(entities[0], type(entities[0]))
        searched_entities = [pascal_to_words(entity).lower().replace(":", "") for entity in entities]
        # match_entities = find_near_matches(
        #     to_search.lower(),
        #     searched_entity,
        #     max_deletions=max_deletions,
        #     max_insertions=max_insertions,
        #     max_substitutions=max_substitutions,
        #     max_l_dist=max_l_dist,
        # )

        # print("@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@")
        # print("to_search", to_search)
        # match_entity = fuzz.partial_ratio_alignment(to_search.lower(), searched_entity, score_cutoff=70)

        # thresholds
        rapid_fuzz_cutoff_threshold = 72.1
        min_string_frequency_index = 0.06
        max_allowed_match_length_difference = 2
        #print(filtered_combinations_to_search, "filtered_combinations_to_search")

        entity_scores = rapidfuzz_process.cdist(
            [to_search.lower() for to_search in filtered_combinations_to_search],
            searched_entities, scorer=fuzz.partial_ratio, score_cutoff=rapid_fuzz_cutoff_threshold, workers=-1)

        # print("entity_scores", entity_scores)
        # print("entity_scores", entity_scores.shape)
        matching_indices = np.where(entity_scores > 0)
        # for idx, score in enumerate(entity_scores):
            # mscore = max(score)
            # if mscore > rapid_fuzz_cutoff_threshold:
                # candidate_entity = filtered_combinations_to_search[idx]
                # print("candidate_entity: {}, score: {}".format(candidate_entity, mscore))
         # print("matching_indices", matching_indices)

        if not matching_indices:
            return []

        # entity_scores_filt = entity_scores[entity_scores > 0]
        # print("entity_score ", entity_scores)
        # print("entity_scores filtered ", entity_scores_filt)
        # print("entity matched indices", matching_indices[0])

        # print(len(matching_indices[0]), max(matching_indices[0]))
        # print("@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@")
        # print("matching indices", matching_indices[0])
        # print("@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@")
        # candidate_matches  = [entities[i] for i in matching_indices[0]]
        # print(*candidate_matches, sep="\n")

        final_matching_indices  = []
        # if we got a fuzzysearch result, run the result through a number of hand-made filters
        for candidate_entity_idx, matching_entity_idx in zip(matching_indices[0], matching_indices[1]):
            candidate_entity = filtered_combinations_to_search[candidate_entity_idx].lower()
            searched_entity = pascal_to_words(searched_entities[matching_entity_idx]).lower().replace(":", "")
            #candidate_entity_score = entity_scores[candidate_entity_idx]
            # print("searched_entity", searched_entity)

            match_entity = find_near_matches(
                candidate_entity,
                searched_entity,
                max_deletions=max_deletions,
                max_insertions=max_insertions,
                max_substitutions=max_substitutions,
                max_l_dist=max_l_dist,
            )

            if not match_entity:
                # print(f"--- Drop '{searched_entity}' because no match")
                continue

            #print("match_entity", match_entity)
            match_entity = match_entity[0]

            # first check if match is true by making sure what is said is similiar length to match
            match_len = match_entity.end - match_entity.start # get length of substring that matched
            whole_match = get_whole_match(match_entity, searched_entity) # get length of all the words that that substring belonged to
            match_distance = abs(len(whole_match) - len(candidate_entity))
            if match_distance >= max_allowed_match_length_difference:
                # print(f"--- Drop '{whole_match}' because match distance is too high") #don't print, because too common
                continue

            # if not a very close match, check if the matched entity is rare enough to be a real match
            string_freq_index = self.get_string_freq(whole_match.replace(":",""))
            if (match_entity.dist > 1) and (string_freq_index < min_string_frequency_index):
                # print(f"--- Drop '{whole_match}' because too common words")
                continue

            # never match on just a single word (but allow PascalCase style through as it's multiple words)
            if not (" " in whole_match) and (count_capitals(whole_match) < 2):
                # print(f"-- Skip '{whole_match}' because single word")
                continue

            # if our match is not the start of a word, then don't count it
            if match_entity.start != 0:
                if (searched_entity[match_entity.start - 1] != " "):
                    # print(f"-- Skip '{whole_match}' because it's not the start of a word")
                    continue

            # print("@@@@@@@@@@@@@@ TRUE MATCH")
            # print("--- WHOLEMATCH", whole_match)
            # print("--- SEARCHED ENTITY", searched_entity)
            # print("--- FREQUENCY INDEX", str(string_freq_index))
            # print("--- to_search", candidate_entity)
            # print("searched_entity", searched_entity)

            final_matching_indices.append(matching_entity_idx)

        if not final_matching_indices:
            return []

        # spin it around so it's reverse chronologial
        final_matching_indices.reverse()
        return final_matching_indices
