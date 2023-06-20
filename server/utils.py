from pathlib import Path
from langchain.vectorstores import Chroma
from langchain.embeddings import HuggingFaceEmbeddings 

from pydantic import BaseModel
from typing import Optional, Any, Type

MAX_POSSIBLE_TIME = 120

class UnitMemory:
    """
    A unit memory is a single memory. It is a single memory in a list of memories.

    Attributes:
        text (str): The text of the memory.
        timestamp (int): The timestamp of the memory.

    """
    def __init__(self, text, timestamp):
        self.text = text
        self.timestamp = timestamp

    def __str__(self):
        return f'{self.timestamp}: {self.text}'


class ShortTermMemory:
    """
    An event memory is a memory that is a list of unit memories. It signifies a conversation or event.
    """

    def __init__(self, max_time=120):
        self.memories = []
        self.max_time = min(max_time, MAX_POSSIBLE_TIME) # needs to be below the prompt size

    def __str__(self):
        return ','.join([str(m) for m in self.memories])

    def get_start_time(self):
        return self.memories[0].timestamp

    def get_end_time(self):
        return self.memories[-1].timestamp

    def add_memory(self, memory: UnitMemory):
        self.memories.append(memory)

        removed_memories = []

        # remove old memories
        while self.get_end_time() - self.get_start_time() > self.max_time:
            m = self.memories.pop(0)
            removed_memories.append(m)

        return removed_memories

class LongTermMemory:

    def __init__(self, userID):
        self.emb_fn = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")

        self.persist_directory = str(Path('memory_db') / userID)

        self.db = Chroma(
            collection_name="memories",
            embedding_function=self.emb_fn,
            persist_directory=self.persist_directory
        )

    def __str__(self):
        return self.db.get()

    def add_memory(self, memory):
        filtered_memory = self.filter_memory(memory)
        if len(filtered_memory.text) < 5:
            return
        self.db.add_texts([filtered_memory.text], {"timestamp": filtered_memory.timestamp})

    def add_memories(self, memories):
        for memory in memories:
            self.add_memory(memory)

    def filter_memory(self, memory):
        # remove filler words in the memory
        filler_words = ['um', 'uh']
        for word in filler_words:
            memory.text = memory.text.replace(word, '')
        return memory

    def retrieve_memories_in_time_range(self, start_time, end_time):
        time_query = {
            "$and": [
                {
                    "timestamp": {"$gte": start_time}
                },
                {
                    "timestamp": {"$lte": end_time}
                }
            ]
        }
        return self.db._collection.get(where=time_query)

    def retrieve_memories_query(self, full_query):
        retrieved_memories = self.db._collection.query(**full_query)
        retrieved_docs = retrieved_memories['documents'][0]
        return "\n".join(retrieved_docs)
    
############## Agent #####################

from typing import Optional, Any
from datetime import datetime
from langchain.tools import BaseTool

class TimeNavigator(BaseTool):
    name = "Time navigator"
    description = "A tool that helps you navigate time and collect transcripts given the start and end time in the 24 hour format of %m/%d/%Y, %H:%M:%S."
    ltm_memory : LongTermMemory = None

    def _run(self, start_time: str, end_time: str):
        # convert the time to timestamp in system time
        start_time = datetime.strptime(start_time.strip(), '%m/%d/%Y, %H:%M:%S')
        end_time = datetime.strptime(end_time.strip(), '%m/%d/%Y, %H:%M:%S')

        start_time_timestamp = start_time.timestamp()
        end_time_timestamp = end_time.timestamp()

        # get the memories in the time range
        focus_logs = self.ltm_memory.retrieve_memories_in_time_range(start_time_timestamp, end_time_timestamp)

        print("Found these Logs")
        found_logs = '\n'.join(focus_logs)
        return found_logs
    
    def _arun(self, start_time, end_time):
        raise NotImplementedError("This tool does not support asynchronous execution.")


class CurrentTime(BaseTool):
    name = "Current Time"
    description = "A tool that helps you get the time and date right now. You need it for calculating the time range for the Time Navigator tool"

    def _run(self):
        return '06/16/2023, 17:37:43'
        return datetime.now().strftime("%m/%d/%Y, %H:%M:%S")
    
    def _arun(self, start_time, end_time):
        raise NotImplementedError("This tool does not support asynchronous execution.")


# TODO(wazeer): make a tool to use the vectorstore to find the memories that are needed by forming the query to the vectorstore
class MemoryRetriever(BaseTool):
    name = "Memory Retriever"
    description = "A tool that helps you retrieve memories from your long term memory. You can pass in a query and a time range to retrieve the memories. The time range is OPTIONAL, use it only if the query requires you to select a certain time range. The times have to be in the 24 hour format of %m/%d/%Y, %H:%M:%S "
    # args_schema : Type[BaseModel] = QueryRetriever
    ltm_memory : LongTermMemory = None

    def _run(self, query: str, start_time: Optional[str] = "", end_time: Optional[str] = ""):
        full_query = {
            "query_texts": query,
        }
        if len(start_time)>5 and len(end_time)>5:
            # convert the time to timestamp in system time
            start_time = datetime.strptime(start_time.strip(), '%m/%d/%Y, %H:%M:%S')
            end_time = datetime.strptime(end_time.strip(), '%m/%d/%Y, %H:%M:%S')

            start_time_timestamp = start_time.timestamp()
            end_time_timestamp = end_time.timestamp()

            full_query["where"] = {
                "$and": [
                        {
                            "timestamp": {"$gte": start_time_timestamp}
                        },
                        {
                            "timestamp": {"$lte": end_time_timestamp}
                        }
                    ]
                }
            
        memories = self.ltm_memory.retrieve_memories_query(full_query)

        # may need to summarize the memories depending on the length
        return memories

    def _arun(self):
        raise NotImplementedError("This tool does not support asynchronous execution.")
