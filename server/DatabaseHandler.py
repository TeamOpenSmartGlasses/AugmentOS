from pymongo.mongo_client import MongoClient
from pymongo.server_api import ServerApi
import time
import math
from server_config import databaseUri

class DatabaseHandler:
    def __init__(self):
        self.uri = databaseUri
        self.maxTranscriptsPerUser = 2
        self.userCollection = None
        self.ready = False

        # Create a new client and connect to the server
        self.client = MongoClient(self.uri, server_api=ServerApi('1'))
        # Send a ping to confirm a successful connection
        try:
            self.client.admin.command('ping')
            print("Pinged your deployment. You successfully connected to MongoDB!")
            
            # Success!
            self.initUsersCollection()

        except Exception as e:
            print(e)

    ### MISC ###

    def initUsersCollection(self):
        self.userDb = self.client['users']
        if 'users' in self.userDb.list_collection_names():
            self.userCollection = self.userDb.get_collection('users')

            # TODO: Temporary (wipe the db on startup):
            self.userCollection.drop()
            self.initUsersCollection()
        else:
            self.userCollection = self.userDb.create_collection('users')

        self.ready = True

    def createUserIfNotExists(self, userId):
        users = self.userCollection.find()
        needCreate = True
        for u in users:
            if userId == u['userId']:
                needCreate = False
        if needCreate:
            print('Creating new user: ' + userId)
            self.userCollection.insert_one({"userId": userId, "transcripts": [], "cseResults": [], "uiList": []})

    ### TRANSCRIPTS ###

    def stringifyTranscripts(self, transcriptList):
        output = ""
        
        # Concatenate text of all FINAL transcripts
        lastFinalTranscriptIndex = 99999999
        for index, t in enumerate(transcriptList):
            if t['isFinal'] == True:
                lastFinalTranscriptIndex = index
                output = output + t['text'] + ' \n'
        
        # Then add the last intermediate if it occurs later than the latest final...
        lastIntermediateText = ""
        for i in range (lastFinalTranscriptIndex, len(transcriptList)):
            if transcriptList[i]['isFinal'] == False:
                lastIntermediateText = transcriptList[i]['text']
        output = output + ' \n' + lastIntermediateText

        return output.strip()

    def saveTranscriptForUser(self, userId, text, timestamp, isFinal):
        transcript = {"userId": userId, "text": text, "timestamp": timestamp, "isFinal": isFinal}
        self.createUserIfNotExists(userId)

        # Remove old transcripts if there are too many, must come before the update_one call
        if len(self.getRecentTranscriptsForUser(userId)) > self.maxTranscriptsPerUser:
            self.popOldestTranscriptForUser(userId)

        filter = {"userId": userId}
        update = {"$push": {"transcripts": transcript}}
        self.userCollection.update_one(filter=filter, update=update)

    def getRecentTranscriptsForUser(self, userId, deleteAfter = False):
        self.createUserIfNotExists(userId)
        user = self.userCollection.find_one({"userId": userId})
        transcripts = user['transcripts']
        if deleteAfter: self.deleteAllTranscriptsForUser(userId)
        return transcripts

    def getRecentTranscriptsForUserAsString(self, userId, deleteAfter = False):
        transcripts = self.getRecentTranscriptsForUser(userId, deleteAfter=deleteAfter)
        return self.stringifyTranscripts(transcriptList=transcripts)

    def popOldestTranscriptForUser(self, userId):
        filter = {"userId": userId}
        update = {"$pop": {"transcripts": -1}}
        self.userCollection.update_one(filter=filter, update=update)

    def deleteAllTranscriptsForUser(self, userId):
        filter = {"userId": userId}
        update = {"$set": {"transcripts": []}}
        self.userCollection.update_one(filter=filter, update=update)

    def getRecentTranscriptsForAllUsers(self, combineTranscripts = False, deleteAfter = False):
        users = self.userCollection.find()
        transcripts = []
        for user in users:
            userId = user['userId']
            if combineTranscripts:
                transcriptString = self.getRecentTranscriptsForUserAsString(userId, deleteAfter=deleteAfter)
                if transcriptString != "": 
                    transcripts.append({'userId': userId, 'text': transcriptString})
            else:
                transcripts.extend(self.getRecentTranscriptsForUser(userId, deleteAfter=deleteAfter))
        
        return transcripts

    def getTranscriptsFromLastNSecondsForUser(self, userId, n = 30):
        seconds = n * 1000
        allTranscripts = self.getRecentTranscriptsForUser(userId)

        recentTranscripts = []
        currentTime = math.trunc(time.time())
        for transcript in allTranscripts:
            if currentTime - transcript['timestamp'] < seconds:
                recentTranscripts.append(transcript)
        return recentTranscripts
    
    def getTranscriptsFromLastNSecondsForUserAsString(self, userId, n = 30):
        transcripts = self.getTranscriptsFromLastNSecondsForUser(userId, n)
        return self.stringifyTranscripts(transcriptList=transcripts)

    ### CSE RESULTS ###

    def addCseResultForUser(self, userId, result):
        filter = {"userId": userId}
        update = {"$push": {"cseResults": result}}
        self.userCollection.update_one(filter=filter, update=update)
    
    def deleteCseResultsForUser(self, userId):
        filter = {"userId": userId}
        update = {"$set": {"cseResults": []}}
        self.userCollection.update_one(filter=filter, update=update)

    ### CSE RESULTS FOR SPECIFIC DEVICE (USE THIS) ###

    def getCseResultsForUserDevice(self, userId, deviceId, shouldConsume = True, includeConsumed = False):
        self.addUiDeviceToUserIfNotExists(userId, deviceId)

        user = self.userCollection.find_one({"userId": userId})
        results = user['cseResults'] if user != None else []
        alreadyConsumedIds = [] if includeConsumed else self.getConsumedCseResultIdsForUserDevice(userId, deviceId)
        newResults = []
        for res in results:
            if ('uuid' in res) and (res['uuid'] not in alreadyConsumedIds):
                if shouldConsume: self.addConsumedCseResultIdForUserDevice(userId, deviceId, res['uuid'])
                newResults.append(res)        
        return newResults

    def addConsumedCseResultIdForUserDevice(self, userId, deviceId, consumedResultUUID):
        filter = {"userId": userId, "uiList.deviceId": deviceId}
        update = {"$addToSet": {"uiList.$.consumedCseResultIds": consumedResultUUID}}
                  #"$addToSet": {"uiList": deviceId}}
        self.userCollection.update_many(filter=filter, update=update)

    def getConsumedCseResultIdsForUserDevice(self, userId, deviceId):
        filter = {"userId": userId, "uiList.deviceId": deviceId}
        user = self.userCollection.find_one(filter=filter)
        if user == None or user['uiList'] == None or user['uiList'][0] == None: return []
        toReturn = user['uiList'][0]['consumedCseResultIds']
        return toReturn if toReturn != None else []
    
    def getCseResultByUUID(self, uuid):
        filter = {"cseResults.uuid" : uuid}
        user = self.userCollection.find_one(filter=filter)
        userResults = user['cseResults']
        for res in userResults:
            if res['uuid'] == uuid:
                return res
        return None
    
    def getConsumedCseResultsForUserDevice(self, userId, deviceId):
        consumedIds = self.getConsumedCseResultIdsForUserDevice(userId, deviceId)
        consumedResults = []
        for id in consumedIds:
            result = self.getCseResultByUUID(id)
            if result != None:
                consumedResults.append(result)
        return consumedResults

    def getDefinedTermsFromLastNSecondsForUserDevice(self, userId, n = 300):
        seconds = n * 1000
        consumedResults = self.getCseResultsForUserDevice(userId=userId, deviceId="", shouldConsume=False, includeConsumed=True)

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
                if ui['deviceId'] == deviceId: needAdd = False

        if needAdd:
            print("Creating device for user '{}': {}".format(userId, deviceId))
            uiObject = {"deviceId": deviceId, "consumedCseResultIds": []}
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
