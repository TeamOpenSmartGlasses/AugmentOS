from pymongo.mongo_client import MongoClient
from pymongo.server_api import ServerApi
import time
import math
from hashlib import sha256
from server_config import databaseUri, clear_users_on_start, clear_cache_on_start
import uuid


class DatabaseHandler:
    def __init__(self, parentHandler=True):
        print("INITTING DB HANDLER")
        self.uri = databaseUri
        self.minTranscriptWordLength = 5
        self.userCollection = None
        self.cacheCollection = None
        self.ready = False
        self.intermediateTranscriptValidityTime = 0  # .3 # 300 ms in seconds
        self.transcriptExpirationTime = 600  # 10 minutes in seconds
        self.parentHandler = parentHandler
        self.emptyTranscript = {"text": "",
                                "timestamp": -1, "isFinal": False, "uuid": -1}

        # Create a new client and connect to the server
        self.client = MongoClient(self.uri, server_api=ServerApi('1'))

        # Send a ping to confirm a successful connection
        try:
            self.client.admin.command('ping')
            print("Pinged your deployment. You successfully connected to MongoDB!")

            self.initUsersCollection()
            self.initCacheCollection()
        except Exception as e:
            print(e)

    ### INIT ###

    def initUsersCollection(self):
        self.userDb = self.client['users']
        if 'users' in self.userDb.list_collection_names():
            self.userCollection = self.userDb.get_collection('users')

            if clear_users_on_start and self.parentHandler:
                self.userCollection.drop()
                self.initUsersCollection()
        else:
            self.userCollection = self.userDb.create_collection('users')

        self.ready = True

    def initCacheCollection(self):
        self.cacheDb = self.client['cache']
        if 'cache' in self.cacheDb.list_collection_names():
            self.cacheCollection = self.cacheDb.get_collection('cache')

            if clear_cache_on_start and self.parentHandler:
                self.cacheCollection.drop()
                self.initCacheCollection()
        else:
            self.cacheCollection = self.cacheDb.create_collection('cache')

    ### MISC ###

    def createUserIfNotExists(self, userId):
        users = self.userCollection.find()
        needCreate = True
        for u in users:
            if userId == u['userId']:
                needCreate = False
        if needCreate:
            print('Creating new user: ' + userId)
            self.userCollection.insert_one(
                {"userId": userId,
                 "latest_intermediate_transcript": self.emptyTranscript,
                 "final_transcripts": [],
                 "cseConsumedTranscriptId": -1,
                 "cseConsumedTranscriptIdx": -1,
                 "transcripts": [], "cseResults": [], "agentInsightsResults" : [], "uiList": []})

    ### CACHE ###

    def findCachedSummary(self, long_description):
        descriptionHash = sha256(long_description.encode("utf-8")).hexdigest()
        filter = {"description": descriptionHash}
        item = self.cacheCollection.find_one(filter)
        if item and 'summary' in item:
            return item['summary']
        else:
            return None

    def saveCachedSummary(self, long_description, summary):
        descriptionHash = sha256(long_description.encode("utf-8")).hexdigest()
        item = {"description": descriptionHash, "summary": summary}
        self.cacheCollection.insert_one(item)

    ### TRANSCRIPTS ###

    def saveTranscriptForUser(self, userId, text, timestamp, isFinal):
        transcript = {"userId": userId, "text": text,
                      "timestamp": timestamp, "isFinal": isFinal, "uuid": str(uuid.uuid4())}
        self.createUserIfNotExists(userId)

        self.purgeOldTranscriptsForUserId(userId)

        if isFinal:
            # Save to `final_transcripts` database with id `myNewId`
            filter = {"userId": userId}
            update = {"$push": {"final_transcripts": transcript}}
            self.userCollection.update_one(filter=filter, update=update)

            # Set `latest_intermediate_transcript` to empty string and timestamp -1
            update = {
                "$set": {"latest_intermediate_transcript": self.emptyTranscript}}
            self.userCollection.update_one(filter=filter, update=update)

            # If `cseConsumedTranscriptId` == -1:
            # Set `cseConsumedTranscriptId` = `myNewId`
            # `cseConsumedTranscriptIdx` stays the same
            user = self.getUser(userId)
            if user['cseConsumedTranscriptId'] == -1:
                update = {
                    "$set": {"cseConsumedTranscriptId": transcript['uuid']}}
                self.userCollection.update_one(filter=filter, update=update)
        else:
            # Save to `latest_intermediate_transcript` field in database - text and timestamp
            filter = {"userId": userId}
            update = {"$set": {"latest_intermediate_transcript": transcript}}
            self.userCollection.update_one(filter=filter, update=update)

    def getUser(self, userId):
        return self.userCollection.find_one({"userId": userId})

    def getAllTranscriptsForUser(self, userId, deleteAfter=False):
        self.createUserIfNotExists(userId)
        user = self.getUser(userId)
        return user['final_transcripts']

    def getNewCseTranscriptsForUser(self, userId, deleteAfter=False):
        self.createUserIfNotExists(userId)
        user = self.getUser(userId)
        unconsumed_transcripts = []

        if user['cseConsumedTranscriptId'] != -1:
            print()
            # Get the transcript with ID `cseConsumedTranscriptId`, get the last part of it (anything after `cseConsumedTranscriptIdx`)
            first_transcript = None
            for t in user['final_transcripts']:
                # Get the first unconsumed final
                if t['uuid'] == user['cseConsumedTranscriptId']:
                    first_transcript = t
                    startIndex = user['cseConsumedTranscriptIdx']
                    first_transcript['text'] = first_transcript['text'][startIndex:]
                    unconsumed_transcripts.append(first_transcript)
                    continue

                # Get any subsequent unconsumed final
                if first_transcript != None:
                    # (any transcript newer than cseConsumedTranscriptId)
                    # Append any transcript from `final_transcripts` that is newer in time than the `cseConsumedTranscriptId` transcript
                    unconsumed_transcripts.append(t)

            # Append `latest_intermediate_transcript`
            unconsumed_transcripts.append(
                user['latest_intermediate_transcript'])
            indexOffset = 0
        else:
            # Get part `latest_intermediate_transcript` after `cseConsumedTranscriptIdx` index
            startIndex = user['cseConsumedTranscriptIdx']
            t = user['latest_intermediate_transcript']
            # Make sure protect against if intermediate transcript gets smaller
            if (len(t['text']) - 1) > startIndex:
                t['text'] = t['text'][startIndex:]
                unconsumed_transcripts.append(t)
            indexOffset = startIndex

        # Update step
        # `cseConsumedTranscriptId` = -1
        # `cseConsumedTranscriptIdx` to index of most recent transcript we consumed in 1.
        if len(unconsumed_transcripts) > 0:
            newIndex = len(unconsumed_transcripts[-1]['text']) + indexOffset
        else:
            newIndex = 0

        filter = {"userId": userId}
        update = {"$set": {"cseConsumedTranscriptId": -1, "cseConsumedTranscriptIdx": newIndex}}
        self.userCollection.update_one(filter=filter, update=update)
        return unconsumed_transcripts

    def getFinalTranscriptByUuid(self, uuid):
        filter = {"final_transcripts.uuid": uuid}
        return self.userCollection.find_one(filter)

    def getNewCseTranscriptsForUserAsString(self, userId, deleteAfter=False):
        transcripts = self.getNewCseTranscriptsForUser(
            userId, deleteAfter=deleteAfter)
        # print("Running getRecentTranscritsForUserAsString")
        # print(transcripts)
        # return self.stringifyTranscripts(transcriptList=transcripts)
        #return self.getStringifiedTranscriptWindow(transcripts)
        theString = ""
        for t in transcripts:
            theString += t['text'] + ' '
        return theString

    def markTranscriptsAsConsumed(self, userId, transcripts):
        uuidList = [t['uuid'] for t in transcripts]
        # print("WE WANT TO CONSUME UUIDS: ")
        # print(uuidList)

        filter = {"userId": userId, "transcripts.uuid": {"$in": uuidList}}

    def deleteAllTranscriptsForUser(self, userId):
        filter = {"userId": userId}
        update = {"$set": {"transcripts": []}}
        self.userCollection.update_one(filter=filter, update=update)

    def getNewCseTranscriptsForAllUsers(self, combineTranscripts=False, deleteAfter=False):
        users = self.userCollection.find()
        transcripts = []
        for user in users:
            userId = user['userId']
            if combineTranscripts:
                transcriptString = self.getNewCseTranscriptsForUserAsString(
                    userId, deleteAfter=deleteAfter)
                if transcriptString:
                    transcripts.append(
                        {'userId': userId, 'text': transcriptString})
            else:
                transcripts.extend(self.getNewCseTranscriptsForUser(
                    userId, deleteAfter=deleteAfter))

        return transcripts

    def getRecentTranscriptsFromLastNSecondsForAllUsers(self, n=30):
        users = self.userCollection.find()
        transcripts = []
        for user in users:
            userId = user['userId']
            transcriptString = self.getTranscriptsFromLastNSecondsForUserAsString(
                userId, n)
            if transcriptString:
                transcripts.append(
                    {'userId': userId, 'text': transcriptString})

        return transcripts
    
    def getTranscriptsFromLastNSecondsForUser(self, userId, n=30):
        seconds = n #* 1000
        allTranscripts = self.getAllTranscriptsForUser(userId)

        recentTranscripts = []
        currentTime = time.time()
        for transcript in allTranscripts:
            if currentTime - transcript['timestamp'] < seconds:
                recentTranscripts.append(transcript)
        return recentTranscripts

    def getTranscriptsFromLastNSecondsForUserAsString(self, userId, n=30):
        transcripts = self.getTranscriptsFromLastNSecondsForUser(userId, n)
        return self.stringifyTranscripts(transcriptList=transcripts)

    def purgeOldTranscriptsForUserId(self, userId):
        transcriptExpirationDate = time.time() - self.transcriptExpirationTime
        filter = {'userId': userId}
        condition = {'$pull': {'transcripts': {
            'timestamp': {'$lt': transcriptExpirationDate}}}}
        self.userCollection.update_many(filter, condition)

    ## TRANSCRIPT FORMATTING ###

    def getStringifiedTranscriptWindow(self, transcriptList):
        # If we only have an intermediate, use the latest 15 words at most
        #if len(transcriptList) == 1 and not transcriptList[0]['isFinal']:
        #    text = transcriptList[0]['text']
        #    textWordList = text.strip().split()
        #    textLastNWords = ' '.join(textWordList[-(15-len(textWordList)):])
        #    return textLastNWords

        #transcriptToRunOn = ""
        #for t in transcriptList:
        #    if False:
        #        # This is effectively the backslider/window/thing
        #       # TODO: Only take last 4 words?
        #        transcriptToRunOn += " " + t['text']
        #    else:
        #        transcriptToRunOn += " " + t['text']

        # if len(transcriptList) == 0: return None
        # backSlider = 4
        # latestTranscript = transcriptList[-1]['text']
        # latestTranscriptWordList = latestTranscript.strip().split()
        # transcriptToRunOn = latestTranscript
        # if len(latestTranscriptWordList) < backSlider and len(transcriptList) > 1:
        #     # Defer to penultimate transcript (if there is one)
        #     penultimateTranscript = transcriptList[-2]['text']
        #     penultimateTranscriptWordList = penultimateTranscript.strip().split()
        #     penultimateTranscriptLastNWords = ' '.join(penultimateTranscriptWordList[-(backSlider-len(latestTranscriptWordList)):])
        #     transcriptToRunOn = penultimateTranscriptLastNWords + ' ' + latestTranscript
        return 0

    def stringifyTranscripts(self, transcriptList):
        output = ""
        if len(transcriptList) == 0:
            return output

        # Concatenate text of all FINAL transcripts
        lastFinalTranscriptIndex = 99999999
        for index, t in enumerate(transcriptList):
            if t['isFinal'] == True:
                lastFinalTranscriptIndex = index
                output = output + t['text'] + ' '

        # Then add the last intermediate if it occurs later than the latest final...
        lastIntermediateText = ""
        for i in range(lastFinalTranscriptIndex, len(transcriptList)):
            if transcriptList[i]['isFinal'] == False:
                lastIntermediateText = transcriptList[i]['text']
        output = output + ' ' + lastIntermediateText

        return output.strip()

    ### CSE RESULTS ###

    def addCseResultsForUser(self, userId, results):
        filter = {"userId": userId}
        update = {"$push": {"cseResults": {'$each': results}}}
        self.userCollection.update_one(filter=filter, update=update)

    def deleteCseResultsForUser(self, userId):
        filter = {"userId": userId}
        update = {"$set": {"cseResults": []}}
        self.userCollection.update_one(filter=filter, update=update)

    def addAgentInsightsResultsForUser(self, userId, results):
        filter = {"userId": userId}
        update = {"$push": {"agentInsightsResults": {'$each': results}}}
        self.userCollection.update_one(filter=filter, update=update)

    ### CSE RESULTS FOR SPECIFIC DEVICE (USE THIS) ###

    def getCseResultsForUserDevice(self, userId, deviceId, shouldConsume=True, includeConsumed=False):
        self.addUiDeviceToUserIfNotExists(userId, deviceId)

        user = self.userCollection.find_one({"userId": userId})
        results = user['cseResults'] if user != None else []
        alreadyConsumedIds = [
        ] if includeConsumed else self.getConsumedCseResultIdsForUserDevice(userId, deviceId)
        newResults = []
        for res in results:
            if ('uuid' in res) and (res['uuid'] not in alreadyConsumedIds):
                if shouldConsume:
                    self.addConsumedCseResultIdForUserDevice(
                        userId, deviceId, res['uuid'])
                newResults.append(res)
        return newResults

    def getAgentInsightsResultsForUserDevice(self, userId, deviceId, shouldConsume=True, includeConsumed=False):
        self.addUiDeviceToUserIfNotExists(userId, deviceId)

        user = self.userCollection.find_one({"userId": userId})
        results = user['agentInsightsResults'] if user != None else []
        alreadyConsumedIds = [
        ] if includeConsumed else self.getConsumedAgentInsightsResultIdsForUserDevice(userId, deviceId)
        newResults = []
        for res in results:
            if ('uuid' in res) and (res['uuid'] not in alreadyConsumedIds):
                if shouldConsume:
                    self.addConsumedAgentInsightsResultIdForUserDevice(
                        userId, deviceId, res['uuid'])
                newResults.append(res)
        return newResults

    def addConsumedCseResultIdForUserDevice(self, userId, deviceId, consumedResultUUID):
        filter = {"userId": userId, "uiList.deviceId": deviceId}
        update = {"$addToSet": {
            "uiList.$.consumedCseResultIds": consumedResultUUID}}
        # "$addToSet": {"uiList": deviceId}}
        self.userCollection.update_many(filter=filter, update=update)

    def addConsumedAgentInsightsResultIdForUserDevice(self, userId, deviceId, consumedResultUUID):
        filter = {"userId": userId, "uiList.deviceId": deviceId}
        update = {"$addToSet": {
            "uiList.$.consumedAgentInsightsResultIds": consumedResultUUID}}
        # "$addToSet": {"uiList": deviceId}}
        self.userCollection.update_many(filter=filter, update=update)

    def getConsumedCseResultIdsForUserDevice(self, userId, deviceId):
        filter = {"userId": userId, "uiList.deviceId": deviceId}
        user = self.userCollection.find_one(filter=filter)
        if user == None or user['uiList'] == None or user['uiList'][0] == None:
            return []
        toReturn = user['uiList'][0]['consumedCseResultIds']
        return toReturn if toReturn != None else []

    def getConsumedAgentInsightsResultIdsForUserDevice(self, userId, deviceId):
        filter = {"userId": userId, "uiList.deviceId": deviceId}
        user = self.userCollection.find_one(filter=filter)
        if user == None or user['uiList'] == None or user['uiList'][0] == None:
            return []
        toReturn = user['uiList'][0]['consumedAgentInsightsResultIds']
        return toReturn if toReturn != None else []

    def getCseResultByUUID(self, uuid):
        filter = {"cseResults.uuid": uuid}
        user = self.userCollection.find_one(filter=filter)
        userResults = user['cseResults']
        for res in userResults:
            if res['uuid'] == uuid:
                return res
        return None

    def getConsumedCseResultsForUserDevice(self, userId, deviceId):
        consumedIds = self.getConsumedCseResultIdsForUserDevice(
            userId, deviceId)
        consumedResults = []
        for id in consumedIds:
            result = self.getCseResultByUUID(id)
            if result != None:
                consumedResults.append(result)
        return consumedResults

    def getDefinedTermsFromLastNSecondsForUserDevice(self, userId, n=300):
        seconds = n  # * 1000
        consumedResults = self.getCseResultsForUserDevice(
            userId=userId, deviceId="", shouldConsume=False, includeConsumed=True)

        previouslyDefinedTerms = []
        currentTime = math.trunc(time.time())
        for result in consumedResults:
            if currentTime - result['timestamp'] < seconds:
                previouslyDefinedTerms.append(result)
        return previouslyDefinedTerms

    ### UI DEVICE ###

    def getAllUiDevicesForUser(self, userId):
        user = self.userCollection.find_one({"userId": userId})
        uiList = user['uiList']
        uiListIds = []
        for ui in uiList:
            uiListIds.append(ui['deviceId'])
        return uiListIds

    def addUiDeviceToUserIfNotExists(self, userId, deviceId):
        self.createUserIfNotExists(userId)
        user = self.userCollection.find_one({"userId": userId})

        needAdd = True
        if user['uiList'] != None:
            for ui in user['uiList']:
                if ui['deviceId'] == deviceId:
                    needAdd = False

        if needAdd:
            print("Creating device for user '{}': {}".format(userId, deviceId))
            uiObject = {"deviceId": deviceId, "consumedCseResultIds": [], "consumedAgentInsightsResultIds": []}
            filter = {"userId": userId}
            update = {"$addToSet": {"uiList": uiObject}}
            self.userCollection.update_one(filter=filter, update=update)

### Function list for developers ###
#
# * saveTranscriptForUser
#   => Saves a transcript for a user. User is created if they don't already exist
#
# * addCseResultForUser
#   => Saves a cseResult object to a user's object
#
# * getCseResultsForUserDevice
#   => REQUIRES deviceID. Returns a list of CSE results that have not been consumed by that deviceID yet.
#   => Once this has been run, the same CSE result will not return again for the same deviceID.
#   => Device is created if it doesn't already exist.
#


"""
print("BEGIN DB TESTING")
db = DatabaseHandler()
db.saveTranscriptForUser("alex", "fedora tip", 0, False)
db.addCseResultForUser("alex", {'uuid': '69'})
res1 = db.getCseResultsForUserDevice('alex', 'pc')
print('res1 (Should have 1 obj):')
for r in res1:
    print(r)
res2 = db.getCseResultsForUserDevice('alex', 'pc')
print("res2 (Shouldn't display anything):")
for r in res2:
    print(r)
print('\n\nfinally:')
z = db.userCollection.find()
for pp in z:
    print(pp)
"""
