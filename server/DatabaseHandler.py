from pymongo.mongo_client import MongoClient
from pymongo.server_api import ServerApi

class DatabaseHandler:
    def __init__(self):
        self.uri = "mongodb+srv://alex1115alex:usa@testcluster.lvcrdlg.mongodb.net/?retryWrites=true&w=majority"
        self.maxTranscriptsPerUser = 4
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

    def maybeCreateUser(self, userId):
        users = self.userCollection.find()
        needCreate = True
        for u in users:
            if userId == u['userId']:
                needCreate = False
        if needCreate:
            print('Creating new user: ' + userId)
            self.userCollection.insert_one({"userId": userId, "transcripts": [], "cseResults": []})

    ### TRANSCRIPTS ###

    def stringifyTranscripts(self, transcriptList):
        output = ""
        for t in transcriptList:
            output = output + t['text'] + ' '
        return output

    def saveTranscriptForUserFromObject(self, transcriptObj):
        self.saveTranscriptForUser(userId = transcriptObj["userId"], text=transcriptObj["text"], timestamp=transcriptObj["timestamp"])

    def saveTranscriptForUser(self, userId, text, timestamp, isFinal):
        transcript = {"userId": userId, "text": text, "timestamp": timestamp, "isFinal": isFinal, "consumed": False}
        self.maybeCreateUser(userId)

        filter = {"userId": userId}
        update = {"$push": {"transcripts": transcript}}
        self.userCollection.update_one(filter=filter, update=update)

        # Remove old transcripts if there are too many
        if len(self.getRecentTranscriptsForUser(userId)) > self.maxTranscriptsPerUser:
            self.popOldestTranscriptForUser(userId)

    def getRecentTranscriptsForUser(self, userId, deleteAfter = False):
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

    ### CSE RESULTS ###

    def addCseResultForUser(self, userId, result):
        filter = {"userId": userId}
        update = {"$push": {"cseResults": result}}
        self.userCollection.update_one(filter=filter, update=update)

    def getCseResultsForUser(self, userId, deleteAfter = False):
        user = self.userCollection.find_one({"userId": userId})
        if deleteAfter: self.deleteCseResultsForUser(userId)
        return user['cseResults'] if user != None else []
    
    def deleteCseResultsForUser(self, userId):
        filter = {"userId": userId}
        update = {"$set": {"cseResults": []}}
        self.userCollection.update_one(filter=filter, update=update)


# db = DatabaseHandler()
# db.saveTranscriptForUser("alex", "you may have swag", 0, False)
# db.saveTranscriptForUser("alex", "but i have class", 0, False)
# db.saveTranscriptForUser("alex", "fedora tip", 0, False)
# t = db.getRecentTranscriptsForAllUsers(combineTranscripts=False)
# for x in t: print(x)