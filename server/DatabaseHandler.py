from pymongo.mongo_client import MongoClient
from pymongo.server_api import ServerApi
import time
import agents.wake_words
import math
from hashlib import sha256
from server_config import database_uri, clear_users_on_start, clear_cache_on_start
import uuid


class DatabaseHandler:
    def __init__(self, parent_handler=True):
        print("INITTING DB HANDLER")
        self.uri = database_uri
        self.min_transcript_word_length = 5
        self.wake_word_min_update_time = 2 # 2 seconds
        self.user_collection = None
        self.cache_collection = None
        self.ready = False
        self.backslide = 4
        self.intermediate_transcript_validity_time = 0  # .3 # 300 ms in seconds
        self.final_transcript_validity_time = 0  # .3 # 300 ms in seconds
        self.transcript_expiration_time = 600  # 10 minutes in seconds
        self.parent_handler = parent_handler
        self.empty_transcript = {"text": "", "timestamp": -1, "is_final": False, "uuid": -1}

        # Create a new client and connect to the server
        self.client = MongoClient(self.uri, server_api=ServerApi('1'))

        # Send a ping to confirm a successful connection
        try:
            self.client.admin.command('ping')
            print("Pinged your deployment. You successfully connected to MongoDB!")

            self.init_users_collection()
            self.init_cache_collection()
        except Exception as e:
            print(e)

    ### INIT ###

    def init_users_collection(self):
        self.user_db = self.client['users']
        if 'users' in self.user_db.list_collection_names():
            self.user_collection = self.user_db.get_collection('users')

            if clear_users_on_start and self.parent_handler:
                self.user_collection.drop()
                self.init_users_collection()
        else:
            self.user_collection = self.user_db.create_collection('users')

        self.ready = True

    def init_cache_collection(self):
        self.cache_db = self.client['cache']
        if 'cache' in self.cache_db.list_collection_names():
            self.cache_collection = self.cache_db.get_collection('cache')

            if clear_cache_on_start and self.parent_handler:
                self.cache_collection.drop()
                self.init_cache_collection()
        else:
            self.cache_collection = self.cache_db.create_collection('cache')

    ### MISC ###

    # Returns the index of the nearest beginning of a word before "curr_index"
    # EX: find_closest_start_word_index('hello world, my name is alex!', 5) => 5
    # EX: ...
    # EX: find_closest_start_word_index('hello world, my name is alex!', 11) => 5
    # EX: find_closest_start_word_index('hello world, my name is alex!', 12) => 12
    def find_closest_start_word_index(self, text, curr_index):
        latest_stop_index = 0
        for i, c in enumerate(text):
            if c == " ":
                if(i > curr_index):
                    return latest_stop_index
                latest_stop_index = i
        return curr_index

    def create_user_if_not_exists(self, user_id):
        users = self.user_collection.find()
        need_create = True
        for u in users:
            if user_id == u['user_id']:
                need_create = False
        if need_create:
            print('Creating new user: ' + user_id)
            self.user_collection.insert_one(
                {"user_id": user_id,
                 "latest_intermediate_transcript": self.empty_transcript,
                 "final_transcripts": [],
                 "last_wake_word_time": -1,
                 "cse_consumed_transcript_id": -1,
                 "cse_consumed_transcript_idx": 0, 
                 "transcripts": [], 
                 "cse_results": [], 
                 "ui_list": [],
                 "agent_explicit_queries": [],
                 "agent_explicit_insights_results": [],
                 "agent_insights_results" : []})

    ### CACHE ###

    def find_cached_summary(self, long_description):
        description_hash = sha256(long_description.encode("utf-8")).hexdigest()
        filter = {"description": description_hash}
        item = self.cache_collection.find_one(filter)
        if item and 'summary' in item:
            return item['summary']
        else:
            return None

    def save_cached_summary(self, long_description, summary):
        description_hash = sha256(long_description.encode("utf-8")).hexdigest()
        item = {"description": description_hash, "summary": summary}
        self.cache_collection.insert_one(item)

    def check_for_wake_words_in_transcript_text(self, user_id, text):
        if agents.wake_words.does_text_contain_wake_word(text):
            self.update_wake_word_time_for_user(user_id, time.time())

    ### TRANSCRIPTS ###

    def get_latest_transcript_from_user_obj(self, user_obj):
        if user_obj['latest_intermediate_transcript']['timestamp'] != -1:
            return user_obj['latest_intermediate_transcript']
        elif user_obj['final_transcripts']:
            return user_obj['final_transcripts'][-1]
        else:
            return None 

    def save_transcript_for_user(self, user_id, text, timestamp, is_final):
        if text == "": return

        text = text.strip()

        transcript = {"user_id": user_id, "text": text,
                      "timestamp": timestamp, "is_final": is_final, "uuid": str(uuid.uuid4())}
        
        user = self.get_user(user_id)

        self.purge_old_transcripts_for_user_id(user_id)

        if is_final:
            # Save to `final_transcripts` database with id `my_new_id`
            filter = {"user_id": user_id}
            update = {"$push": {"final_transcripts": transcript}}
            self.user_collection.update_one(filter=filter, update=update)

            # Set `latest_intermediate_transcript` to empty string and timestamp -1
            update = {
                "$set": {"latest_intermediate_transcript": self.empty_transcript}}
            self.user_collection.update_one(filter=filter, update=update)

            # If `cse_consumed_transcript_id` == -1:
            # Set `cse_consumed_transcript_id` = `my_new_id`
            # `cse_consumed_transcript_idx` stays the same
            if user['cse_consumed_transcript_id'] == -1:
                update = {
                    "$set": {"cse_consumed_transcript_id": transcript['uuid']}}
                self.user_collection.update_one(filter=filter, update=update)
            
            # Check for wake words
            self.check_for_wake_words_in_transcript_text(user_id, text)
        else:
            # Save to `latest_intermediate_transcript` field in database - text and timestamp
            filter = {"user_id": user_id}
            update = {"$set": {"latest_intermediate_transcript": transcript}}
            self.user_collection.update_one(filter=filter, update=update)

            # Check for wake words in this intermediate + final word of latest final transcript
            # TODO: Eval if we should detect wake words in intermediates
            latest_final_text = user['final_transcripts'][-1]['text'].strip().split()[-1] if user['final_transcripts'] else ""
            text_to_search = latest_final_text + " " + text
            self.check_for_wake_words_in_transcript_text(user_id, text_to_search)


    def get_user(self, user_id):
        user = self.user_collection.find_one({"user_id": user_id})
        if not user:
            self.create_user_if_not_exists(user_id)
            return self.get_user(user_id)
        return user

    def get_all_transcripts_for_user(self, user_id, delete_after=False):
        self.create_user_if_not_exists(user_id)
        user = self.get_user(user_id)
        transcripts = user['final_transcripts']
        if user['latest_intermediate_transcript']['text']:
            transcripts.append(user['latest_intermediate_transcript'])
        return transcripts

    def combine_text_from_transcripts(self, transcripts, recent_transcripts_only=True):
        curr_time = time.time()
        last_index = len(transcripts) - 1
        text = ""

        for index, t in enumerate(transcripts):
            if recent_transcripts_only and (curr_time - t['timestamp'] < self.final_transcript_validity_time):
                text += t['text']
            elif not recent_transcripts_only:
                text += t['text']

            if index != last_index:
                text += " "

        return text

    def get_new_cse_transcripts_for_user(self, user_id, delete_after=False):
        self.create_user_if_not_exists(user_id)
        user = self.get_user(user_id)
        unconsumed_transcripts = []

        if user['cse_consumed_transcript_id'] != -1:
            # Get the transcript with ID `cse_consumed_transcript_id`, get the last part of it (anything after `cse_consumed_transcript_idx`)
            first_transcript = None
            for index, t in enumerate(user['final_transcripts']):
                # Get the first unconsumed final
                if t['uuid'] == user['cse_consumed_transcript_id']:
                    first_transcript = t
                    start_index = user['cse_consumed_transcript_idx']
                    
                    # ensure start_index points to the beginning of a word
                    start_index = self.find_closest_start_word_index(first_transcript['text'], start_index)

                    # backslide
                    most_recent_final_text = self.combine_text_from_transcripts(user['final_transcripts'][:index])
                    previous_text_to_backslide = most_recent_final_text + " " + first_transcript['text'][:start_index]
                    #most_recent_final_text = user['final_transcripts'][index - 1]['text'] if index > 0 else ""
                    #previous_text_to_backslide = most_recent_final_text + " " + first_transcript['text'][:start_index]
                    backslide_word_list = previous_text_to_backslide.strip().split()
                    backslide_words = ' '.join(backslide_word_list[-(self.backslide-len(backslide_word_list)):])

                    words_from_start = first_transcript['text'][start_index:].strip()
                    first_transcript['text'] = backslide_words + " " + words_from_start if words_from_start else backslide_words

                    if first_transcript['text'] != "":
                        unconsumed_transcripts.append(first_transcript)
                    continue

                # Get any subsequent unconsumed final
                if first_transcript != None:
                    # (any transcript newer than cse_consumed_transcript_id)
                    # Append any transcript from `final_transcripts` that is newer in time than the `cse_consumed_transcript_id` transcript
                    unconsumed_transcripts.append(t)

            # Append `latest_intermediate_transcript`
            if user['latest_intermediate_transcript']['text'] != "":
                unconsumed_transcripts.append(
                    user['latest_intermediate_transcript'])
            index_offset = 0
        else:
            #if the latest intermediate is old/stale, then the frontend client stops streaming transcripts before giving us a final, so make it final and drop it
            stale_intermediate_time = 10
            if (user['latest_intermediate_transcript']['timestamp'] != -1) and ((time.time() - user['latest_intermediate_transcript']['timestamp']) > stale_intermediate_time):
                print("~~~~~~~~~~~~~~ Killing stale intermediate transcript")
                filter = {"user_id": user_id}
                # Set `latest_intermediate_transcript` to empty string and timestamp -1
                update = {
                    "$set": {"latest_intermediate_transcript": self.empty_transcript}}
                self.user_collection.update_one(filter=filter, update=update)

            # Get part `latest_intermediate_transcript` after `cse_consumed_transcript_idx` index
            start_index = user['cse_consumed_transcript_idx']
            t = user['latest_intermediate_transcript']

            # ensure start_index points to the beginning of a word
            start_index = self.find_closest_start_word_index(t['text'], start_index)

            # Make sure protect against if intermediate transcript gets smaller
            if (len(t['text']) - 1) > start_index:
                # backslide
                most_recent_final_text = self.combine_text_from_transcripts(user['final_transcripts'])
                previous_text_to_backslide = most_recent_final_text + " " + t['text'][:start_index]
                #refactor2
                #most_recent_final_text = user['final_transcripts'][-1]['text'] if len(user['final_transcripts']) > 0 else ""
                #previous_text_to_backslide = most_recent_final_text + " " + t['text'][:start_index]
                backslide_word_list = previous_text_to_backslide.strip().split()
                backslide_words = ' '.join(backslide_word_list[-(self.backslide-len(backslide_word_list)):])

                words_from_start = t['text'][start_index:].strip()
                t['text'] = backslide_words + " " + words_from_start
                unconsumed_transcripts.append(t)
            index_offset = start_index

        # Update step
        # `cse_consumed_transcript_id` = -1
        # `cse_consumed_transcript_idx` to index of most recent transcript we consumed in 1.
        if len(unconsumed_transcripts) > 0:
            new_index = len(unconsumed_transcripts[-1]['text']) + index_offset
        else:
            new_index = 0

        filter = {"user_id": user_id}
        update = {"$set": {"cse_consumed_transcript_id": -1, "cse_consumed_transcript_idx": new_index}}
        self.user_collection.update_one(filter=filter, update=update)
        return unconsumed_transcripts

    def update_cse_consumed_transcript_idx_for_user(self, user_id, new_index):
        filter = {"user_id": user_id}
        update = {"$set": {"cse_consumed_transcript_idx": new_index}}
        self.user_collection.update_one(filter=filter, update=update)

    def get_final_transcript_by_uuid(self, uuid):
        filter = {"final_transcripts.uuid": uuid}
        return self.user_collection.find_one(filter)

    def get_new_cse_transcripts_for_user_as_string(self, user_id, delete_after=False):
        transcripts = self.get_new_cse_transcripts_for_user(
            user_id, delete_after=delete_after)
        the_string = ""
        for t in transcripts:
            the_string += t['text'] + ' '
        return the_string.strip()

    def delete_all_transcripts_for_user(self, user_id):
        filter = {"user_id": user_id}
        update = {"$set": {"final_transcripts": []}}
        self.user_collection.update_one(filter=filter, update=update)

    def get_new_cse_transcripts_for_all_users(self, combine_transcripts=False, delete_after=False):
        users = self.user_collection.find()
        transcripts = []
        for user in users:
            user_id = user['user_id']
            if combine_transcripts:
                transcript_string = self.get_new_cse_transcripts_for_user_as_string(
                    user_id, delete_after=delete_after)
                if transcript_string:
                    transcripts.append(
                        {'user_id': user_id, 'text': transcript_string})
            else:
                transcripts.extend(self.get_new_cse_transcripts_for_user(
                    user_id, delete_after=delete_after))

        return transcripts

    def get_recent_transcripts_from_last_nseconds_for_all_users(self, n=30, users_list=None):
        users = self.user_collection.find() if users_list is None else users_list
        transcripts = []
        for user in users:
            user_id = user['user_id']
            transcript_string = self.get_transcripts_from_last_nseconds_for_user_as_string(
                user_id, n)
            if transcript_string:
                transcripts.append(
                    {'user_id': user_id, 'text': transcript_string})

        return transcripts
    
    def get_transcripts_from_last_nseconds_for_user(self, user_id, n=30, transcript_list=None):
        all_transcripts = transcript_list if transcript_list else self.get_all_transcripts_for_user(user_id)

        recent_transcripts = []
        current_time = time.time()
        for transcript in all_transcripts:
            if current_time - transcript['timestamp'] < n:
                recent_transcripts.append(transcript)
        return recent_transcripts

    def get_transcripts_from_last_nseconds_for_user_as_string(self, user_id, n=30, transcript_list=None):
        transcripts = self.get_transcripts_from_last_nseconds_for_user(user_id, n, transcript_list)
        return self.stringify_transcripts(transcript_list=transcripts)

    def purge_old_transcripts_for_user_id(self, user_id):
        transcript_expiration_date = time.time() - self.transcript_expiration_time
        filter = {'user_id': user_id}
        condition = {'$pull': {'transcripts': {
            'timestamp': {'$lt': transcript_expiration_date}}}}
        self.user_collection.update_many(filter, condition)

    ### TRANSCRIPT FORMATTING ###

    def get_stringified_transcript_window(self, transcript_list):
        # If we only have an intermediate, use the latest 15 words at most
        #if len(transcript_list) == 1 and not transcript_list[0]['is_final']:
        #    text = transcript_list[0]['text']
        #    text_word_list = text.strip().split()
        #    text_last_nwords = ' '.join(text_word_list[-(15-len(text_word_list)):])
        #    return text_last_nwords

        #transcript_to_run_on = ""
        #for t in transcript_list:
        #    if False:
        #        # This is effectively the backslider/window/thing
        #       # TODO: Only take last 4 words?
        #        transcript_to_run_on += " " + t['text']
        #    else:
        #        transcript_to_run_on += " " + t['text']

        # if len(transcript_list) == 0: return None
        # back_slider = 4
        # latest_transcript = transcript_list[-1]['text']
        # latest_transcript_word_list = latest_transcript.strip().split()
        # transcript_to_run_on = latest_transcript
        # if len(latest_transcript_word_list) < back_slider and len(transcript_list) > 1:
        #     # Defer to penultimate transcript (if there is one)
        #     penultimate_transcript = transcript_list[-2]['text']
        #     penultimate_transcript_word_list = penultimate_transcript.strip().split()
        #     penultimate_transcript_last_nwords = ' '.join(penultimate_transcript_word_list[-(back_slider-len(latest_transcript_word_list)):])
        #     transcript_to_run_on = penultimate_transcript_last_nwords + ' ' + latest_transcript
        return 0

    def stringify_transcripts(self, transcript_list):
        output = ""
        if len(transcript_list) == 0:
            return output

        for index, t in enumerate(transcript_list):
            output = output + t['text'] + ' '

        return output.strip()

    ### WAKE WORDS ###

    def update_wake_word_time_for_user(self, user_id, timestamp):
        self.create_user_if_not_exists(user_id)
        # print("UPDATE WW TIME")
        current_time = timestamp

        # Only update if we haven't already noted a wake word within the last 2 seconds, OR if the time is -1
        query_condition = {
            "user_id": user_id, 
            '$or': [
                # {'last_wake_word_time': {'$lt': (current_time - self.wake_word_min_update_time)}},
                {'last_wake_word_time': -1}
            ]
        }

        update = {"$set": {"last_wake_word_time": current_time}}
        
        self.user_collection.update_one(query_condition, update)

    def get_users_with_recent_wake_words(self):
        filter = {"last_wake_word_time": {'$ne': -1}}
        relevant_users = self.user_collection.find(filter)
        return relevant_users
    
    def get_wake_word_time_for_user(self, user_id):
        user = self.get_user(user_id)
        return user["last_wake_word_time"]

    def reset_wake_word_time_for_user(self, user_id):
        self.create_user_if_not_exists(user_id)
        filter = {"user_id": user_id}
        update = {"$set": {"last_wake_word_time": -1}}
        self.user_collection.update_one(filter=filter, update=update)

    ### Explicit Queries ###

    def add_explicit_query_for_user(self, user_id, query):
        query_time = math.trunc(time.time())
        query_uuid = str(uuid.uuid4())
        query_obj = {'timestamp': query_time, 'uuid': query_uuid, 'query': query}

        filter = {"user_id": user_id}
        update = {"$push": {"agent_explicit_queries": {'$each': [query_obj]}}}
        self.user_collection.update_one(filter=filter, update=update)

        return query_uuid

    def add_explicit_insight_result_for_user(self, user_id, query, insight):
        insight_time = math.trunc(time.time())
        insight_uuid = str(uuid.uuid4())
        insight_obj = {'timestamp': insight_time, 'uuid': insight_uuid, 'query': query, 'insight': insight}

        filter = {"user_id": user_id}
        update = {"$push": {"agent_explicit_insights_results": {'$each': [insight_obj]}}}
        self.user_collection.update_one(filter=filter, update=update)

    def get_explicit_query_history_for_user(self, user_id, device_id = None, should_consume=True, include_consumed=False):
        self.create_user_if_not_exists(user_id)
        filter = {"user_id": user_id}
        user = self.user_collection.find_one(filter)
    
        results = user['agent_explicit_queries'] if user != None else []
        already_consumed_ids = [
            ] if include_consumed else self.get_consumed_explicit_ids_for_user_device(user_id, device_id)
        new_results = []
        for res in results:
            if ('uuid' in res) and (res['uuid'] not in already_consumed_ids):
                if should_consume:
                    self.add_consumed_explicit_id_for_user_device(
                        user_id, device_id, res['uuid'])
                new_results.append(res)
        return new_results

    def get_explicit_insights_history_for_user(self, user_id, device_id = None, should_consume=True, include_consumed=False):
        user = self.get_user(user_id)
             
        results = user['agent_explicit_insights_results'] if user != None else []
        already_consumed_ids = [
            ] if include_consumed else self.get_consumed_explicit_ids_for_user_device(user_id, device_id, user_obj=user)
        new_results = []
        for res in results:
            if ('uuid' in res) and (res['uuid'] not in already_consumed_ids):
                if should_consume:
                    self.add_consumed_explicit_id_for_user_device(
                        user_id, device_id, res['uuid'])
                new_results.append(res)
        return new_results
    
    def add_consumed_explicit_id_for_user_device(self, user_id, device_id, consumed_uuid):
        filter = {"user_id": user_id, "ui_list.device_id": device_id}
        update = {"$addToSet": {
            "ui_list.$.consumed_explicit_ids": consumed_uuid}}
        # "$add_to_set": {"ui_list": device_id}}
        self.user_collection.update_many(filter=filter, update=update)

    def get_consumed_explicit_ids_for_user_device(self, user_id, device_id, user_obj = None):
        filter = {"user_id": user_id, "ui_list.device_id": device_id}
        user = user_obj if user_obj else self.user_collection.find_one(filter=filter)
        if user == None or user['ui_list'] == None or user['ui_list'][0] == None:
            return []
        to_return = user['ui_list'][0]['consumed_explicit_ids']
        return to_return if to_return != None else []

    ### CSE RESULTS ###

    def add_cse_results_for_user(self, user_id, results):
        filter = {"user_id": user_id}
        update = {"$push": {"cse_results": {'$each': results}}}
        self.user_collection.update_one(filter=filter, update=update)

    def delete_cse_results_for_user(self, user_id):
        filter = {"user_id": user_id}
        update = {"$set": {"cse_results": []}}
        self.user_collection.update_one(filter=filter, update=update)

    def add_agent_insight_result_for_user(self, user_id, agent_name, agent_insight, agent_references=None, agent_motive=None):
        insight_time = math.trunc(time.time())
        insight_uuid = str(uuid.uuid4())
        insight_obj = {'timestamp': insight_time, 'uuid': insight_uuid, 'agent_name': agent_name, 'agent_insight': agent_insight, 'agent_references': agent_references, 'agent_motive': agent_motive}

        filter = {"user_id": user_id}
        update = {"$push": {"agent_insights_results": {'$each': [insight_obj]}}}
        self.user_collection.update_one(filter=filter, update=update)

    ### CSE RESULTS FOR SPECIFIC DEVICE (USE THIS) ###

    def get_cse_results_for_user_device(self, user_id, device_id, should_consume=True, include_consumed=False):
        self.add_ui_device_to_user_if_not_exists(user_id, device_id)

        user = self.user_collection.find_one({"user_id": user_id})
        results = user['cse_results'] if user != None else []
        already_consumed_ids = [
        ] if include_consumed else self.get_consumed_cse_result_ids_for_user_device(user_id, device_id)

        # print("ALREADY CONSUMED IDS:")
        # print(already_consumed_ids)
        new_results = []
        for res in results:
            if ('uuid' in res) and (res['uuid'] not in already_consumed_ids):
                if should_consume:
                    self.add_consumed_cse_result_id_for_user_device(
                        user_id, device_id, res['uuid'])
                new_results.append(res)
        return new_results

    def get_agent_insights_history_for_user(self, user_id, top=10):
        self.create_user_if_not_exists(user_id)
        # filter = {"user_id": user_id}
        # user = self.user_collection.find_one(filter)
        # insights = sorted(user['agent_insights_results'], key=lambda x: x['timestamp'], reverse=True)[:top]
        # return insights

        pipeline = [
            { "$match": { "user_id": user_id } },
            { "$unwind": "$agent_insights_results" },
            { "$sort": { "agent_insights_results.timestamp": -1 } },
            { "$limit": top },
            {
                "$project": {
                    "_id": 0,
                    "insight": "$agent_insights_results.agent_insight",
                    "agent_name": "$agent_insights_results.agent_name"
                }
            }
        ]
        results = list(self.user_collection.aggregate(pipeline))

        print("Insights history RESULTS:", results)

        return results
        

    def get_proactive_agents_insights_results_for_user_device(self, user_id, device_id, should_consume=True, include_consumed=False):
        self.add_ui_device_to_user_if_not_exists(user_id, device_id)

        user = self.user_collection.find_one({"user_id": user_id})
        results = user['agent_insights_results'] if user != None else []
        already_consumed_ids = [
        ] if include_consumed else self.get_consumed_agent_insights_result_ids_for_user_device(user_id, device_id)
        new_results = []
        for res in results:
            if ('uuid' in res) and (res['uuid'] not in already_consumed_ids):
                if should_consume:
                    self.add_consumed_agent_insights_result_id_for_user_device(
                        user_id, device_id, res['uuid'])
                new_results.append(res)
        return new_results

    def add_consumed_cse_result_id_for_user_device(self, user_id, device_id, consumed_result_uuid):
        filter = {"user_id": user_id, "ui_list.device_id": device_id}
        update = {"$addToSet": {
            "ui_list.$.consumed_cse_result_ids": consumed_result_uuid}}
        # "$add_to_set": {"ui_list": device_id}}
        self.user_collection.update_many(filter=filter, update=update)

    def add_consumed_agent_insights_result_id_for_user_device(self, user_id, device_id, consumed_result_uuid):
        filter = {"user_id": user_id, "ui_list.device_id": device_id}
        update = {"$addToSet": {
            "ui_list.$.consumed_agent_insights_result_ids": consumed_result_uuid}}
        # "$add_to_set": {"ui_list": device_id}}
        self.user_collection.update_many(filter=filter, update=update)

    def get_consumed_cse_result_ids_for_user_device(self, user_id, device_id):
        filter = {"user_id": user_id, "ui_list.device_id": device_id}
        user = self.user_collection.find_one(filter=filter)
        if user == None or user['ui_list'] == None or user['ui_list'][0] == None:
            return []
        to_return = user['ui_list'][0]['consumed_cse_result_ids']
        return to_return if to_return != None else []

    def get_consumed_agent_insights_result_ids_for_user_device(self, user_id, device_id):
        filter = {"user_id": user_id, "ui_list.device_id": device_id}
        user = self.user_collection.find_one(filter=filter)
        if user == None or user['ui_list'] == None or user['ui_list'][0] == None:
            return []
        to_return = user['ui_list'][0]['consumed_agent_insights_result_ids']
        return to_return if to_return != None else []

    def get_cse_result_by_uuid(self, uuid):
        filter = {"cse_results.uuid": uuid}
        user = self.user_collection.find_one(filter=filter)
        user_results = user['cse_results']
        for res in user_results:
            if res['uuid'] == uuid:
                return res
        return None

    def get_consumed_cse_results_for_user_device(self, user_id, device_id):
        consumed_ids = self.get_consumed_cse_result_ids_for_user_device(
            user_id, device_id)
        consumed_results = []
        for id in consumed_ids:
            result = self.get_cse_result_by_uuid(id)
            if result != None:
                consumed_results.append(result)
        return consumed_results

    def get_defined_terms_from_last_nseconds_for_user_device(self, user_id, n=300):
        consumed_results = self.get_cse_results_for_user_device(
            user_id=user_id, device_id="", should_consume=False, include_consumed=True)

        previously_defined_terms = []
        current_time = math.trunc(time.time())
        for result in consumed_results:
            if current_time - result['timestamp'] < n:
                previously_defined_terms.append(result)
        return previously_defined_terms

    ### UI DEVICE ###

    def get_all_ui_devices_for_user(self, user_id):
        user = self.user_collection.find_one({"user_id": user_id})
        ui_list = user['ui_list']
        ui_list_ids = []
        for ui in ui_list:
            ui_list_ids.append(ui['device_id'])
        return ui_list_ids

    def add_ui_device_to_user_if_not_exists(self, user_id, device_id):
        self.create_user_if_not_exists(user_id)
        user = self.user_collection.find_one({"user_id": user_id})

        need_add = True
        if user['ui_list'] != None:
            for ui in user['ui_list']:
                if ui['device_id'] == device_id:
                    need_add = False

        if need_add:
            print("Creating device for user '{}': {}".format(user_id, device_id))
            ui_object = {"device_id": device_id, "consumed_cse_result_ids": [], "consumed_agent_insights_result_ids": [], "consumed_explicit_ids": []}
            filter = {"user_id": user_id}
            update = {"$addToSet": {"ui_list": ui_object}}
            self.user_collection.update_one(filter=filter, update=update)

### Function list for developers ###
#
# * save_transcript_for_user
#   => Saves a transcript for a user. User is created if they don't already exist
#
# * add_cse_result_for_user
#   => Saves a cse_result object to a user's object
#
# * get_cse_results_for_user_device
#   => REQUIRES device_id. Returns a list of CSE results that have not been consumed by that device_id yet.
#   => Once this has been run, the same CSE result will not return again for the same device_id.
#   => Device is created if it doesn't already exist.
#


"""
print("BEGIN DB TESTING")
db = DatabaseHandler()
db.save_transcript_for_user("alex", "fedora tip", 0, False)
db.add_cse_result_for_user("alex", {'uuid': '69'})
res1 = db.get_cse_results_for_user_device('alex', 'pc')
print('res1 (Should have 1 obj):')
for r in res1:
    print(r)
res2 = db.get_cse_results_for_user_device('alex', 'pc')
print("res2 (Shouldn't display anything):")
for r in res2:
    print(r)
print('\n\nfinally:')
z = db.user_collection.find()
for pp in z:
    print(pp)
"""
